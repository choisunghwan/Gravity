package com.gravity.service;

import com.gravity.dto.PostDto;
import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.Post;
import com.gravity.entity.PostLike;
import com.gravity.entity.User;
import com.gravity.repository.CompatibilityResultRepository;
import com.gravity.repository.NotificationRepository;
import com.gravity.repository.PostLikeRepository;
import com.gravity.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CompatibilityResultRepository compatibilityResultRepository;
    private final NotificationRepository notificationRepository;

    @Transactional
    public Post createPost(User author, String content, boolean isPublic) {
        Post post = Post.builder()
                .author(author)
                .content(content)
                .isPublic(isPublic)
                .build();
        post = postRepository.save(post);

        // 연결된 행성들에게 알림
        List<CompatibilityResult> connections = compatibilityResultRepository.findAllByUserOrPartner(author);
        for (CompatibilityResult cr : connections) {
            User recipient = cr.getUser().getId().equals(author.getId()) ? cr.getPartner() : cr.getUser();
            com.gravity.entity.Notification notif = com.gravity.entity.Notification.builder()
                    .recipient(recipient)
                    .fromUser(author)
                    .type("POST")
                    .message(author.getName() + "님이 새 신호를 보냈어요 ✨")
                    .link("/feed")
                    .build();
            notificationRepository.save(notif);
        }
        return post;
    }

    @Transactional(readOnly = true)
    public List<PostDto> getFeedPosts(User currentUser) {
        List<CompatibilityResult> connections = compatibilityResultRepository.findAllByUserOrPartner(currentUser);
        List<Long> authorIds = new ArrayList<>();
        authorIds.add(currentUser.getId());
        for (CompatibilityResult cr : connections) {
            Long id = cr.getUser().getId().equals(currentUser.getId()) ? cr.getPartner().getId() : cr.getUser().getId();
            if (!authorIds.contains(id)) authorIds.add(id);
        }
        List<Post> posts = postRepository.findFeedPosts(authorIds);
        return toPostDtos(posts, currentUser);
    }

    @Transactional(readOnly = true)
    public List<PostDto> getPostsByAuthor(User author, User currentUser) {
        boolean isConnected = compatibilityResultRepository.findAllByUserOrPartner(currentUser)
                .stream().anyMatch(cr ->
                        cr.getUser().getId().equals(author.getId()) ||
                        cr.getPartner().getId().equals(author.getId()));

        List<Post> posts = postRepository.findByAuthorOrderByCreatedAtDesc(author);
        if (!currentUser.getId().equals(author.getId()) && !isConnected) {
            posts = posts.stream().filter(Post::isPublic).collect(Collectors.toList());
        }
        return toPostDtos(posts, currentUser);
    }

    @Transactional
    public long toggleLike(Long postId, User user) {
        Post post = postRepository.findById(postId).orElseThrow();
        Optional<PostLike> existing = postLikeRepository.findByPostAndUser(post, user);
        if (existing.isPresent()) {
            postLikeRepository.delete(existing.get());
        } else {
            PostLike like = PostLike.builder().post(post).user(user).build();
            postLikeRepository.save(like);

            // 내 글이 아닐 때 글쓴이에게 알림
            if (!post.getAuthor().getId().equals(user.getId())) {
                com.gravity.entity.Notification notif = com.gravity.entity.Notification.builder()
                        .recipient(post.getAuthor())
                        .fromUser(user)
                        .type("LIKE")
                        .message(user.getName() + "님이 내 신호에 🌟 끌림을 보냈어요")
                        .link("/feed")
                        .build();
                notificationRepository.save(notif);
            }
        }
        return postLikeRepository.countByPost(post);
    }

    @Transactional
    public void deletePost(Long postId, User currentUser) {
        Post post = postRepository.findById(postId).orElseThrow();
        if (!post.getAuthor().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }
        postLikeRepository.deleteAllByPostId(postId);
        postRepository.delete(post);
    }

    private List<PostDto> toPostDtos(List<Post> posts, User currentUser) {
        if (posts.isEmpty()) return List.of();
        List<Long> postIds = posts.stream().map(Post::getId).collect(Collectors.toList());
        Set<Long> likedIds = postLikeRepository.findLikedPostIds(currentUser, postIds);

        return posts.stream().map(p -> PostDto.builder()
                .id(p.getId())
                .content(p.getContent())
                .isPublic(p.isPublic())
                .createdAt(p.getCreatedAt())
                .authorId(p.getAuthor().getId())
                .authorName(p.getAuthor().getName())
                .authorEmoji(p.getAuthor().getPlanetEmoji())
                .authorColor(p.getAuthor().getPlanetColor())
                .likeCount(postLikeRepository.countByPost(p))
                .likedByMe(likedIds.contains(p.getId()))
                .build()
        ).collect(Collectors.toList());
    }
}
