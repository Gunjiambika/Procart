@echo off
setlocal

set "MVNW_DIR=%~dp0"
set "MAVEN_VERSION=3.9.9"
set "MAVEN_HOME=%MVNW_DIR%.mvn\apache-maven-%MAVEN_VERSION%"
set "MAVEN_BIN=%MAVEN_HOME%\bin\mvn.cmd"
set "MAVEN_ZIP=%MVNW_DIR%.mvn\apache-maven-%MAVEN_VERSION%-bin.zip"
set "MAVEN_URL=https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip"

if exist "%MAVEN_BIN%" goto run_maven

echo Downloading Apache Maven %MAVEN_VERSION%...
if not exist "%MVNW_DIR%.mvn" mkdir "%MVNW_DIR%.mvn"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%';" ^
  "Expand-Archive -LiteralPath '%MAVEN_ZIP%' -DestinationPath '%MVNW_DIR%.mvn' -Force"

if errorlevel 1 (
  echo Failed to download Maven. Please check your internet connection and try again.
  exit /b 1
)

:run_maven
call "%MAVEN_BIN%" %*
