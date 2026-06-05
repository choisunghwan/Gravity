package com.gravity.service;

import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.Post;
import com.gravity.entity.User;
import com.gravity.repository.CompatibilityResultRepository;
import com.gravity.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final CompatibilityResultRepository compatibilityResultRepository;

    @Transactional
    public Post createPost(User author, String content, boolean isPublic) {
        Post post = Post.builder()
                .author(author)
                .content(content)
                .isPublic(isPublic)
                .build();
        return postRepository.save(post);
    }

    @Transactional(readOnly = true)
    public List<Post> getFeedPosts(User currentUser) {
        List<CompatibilityResult> connections = compatibilityResultRepository.findAllByUserOrPartner(currentUser);
        List<Long> authorIds = new ArrayList<>();
        authorIds.add(currentUser.getId());
        for (CompatibilityResult cr : connections) {
            if (cr.getUser().getId().equals(currentUser.getId())) {
                authorIds.add(cr.getPartner().getId());
            } else {
                authorIds.add(cr.getUser().getId());
            }
        }
        return postRepository.findFeedPosts(authorIds);
    }

    @Transactional
    public void deletePost(Long postId, User currentUser) {
        Post post = postRepository.findById(postId).orElseThrow();
        if (!post.getAuthor().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }
        postRepository.delete(post);
    }
}
