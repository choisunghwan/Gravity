@echo off
setlocal

set MVN_VERSION=3.9.6
set MVN_HOME=%USERPROFILE%\.m2\wrapper\apache-maven-%MVN_VERSION%
set MVN_EXE=%MVN_HOME%\bin\mvn.cmd

if exist "%MVN_EXE%" goto run

echo Downloading Maven %MVN_VERSION% (first time only, ~1-3 min)...
powershell -NoProfile -NonInteractive -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; $zip='%TEMP%\mvn.zip'; (New-Object Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MVN_VERSION%/apache-maven-%MVN_VERSION%-bin.zip',$zip); Expand-Archive -Path $zip -DestinationPath '%USERPROFILE%\.m2\wrapper' -Force; Remove-Item $zip"

if not exist "%MVN_EXE%" (
    echo Maven download failed. Install manually: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

echo Maven ready!

:run
"%MVN_EXE%" %*
