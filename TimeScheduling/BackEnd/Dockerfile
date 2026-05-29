# 1. 자바 21 버전의 깨끗한 개발 환경을 구글 컴퓨터에 가져옵니다.
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# 2. 팀원에게 받은 소스 코드를 그 환경 안으로 전부 복사합니다.
COPY . .

# 3. 테스트 코드는 제외하고, 실행 가능한 하나의 압축 파일(JAR)로 빌드합니다.
RUN chmod +x ./gradlew && ./gradlew bootJar -x test

# 4. 실행을 위한 아주 가볍고 보안이 강화된 자바 환경을 새로 준비합니다. (용량 최적화)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 5. 3번 과정에서 만들어진 알맹이 파일(.jar)만 쏙 빼와서 복사합니다.
COPY --from=builder /app/build/libs/*.jar app.jar

# 6. 이 상자가 켜질 때 스프링 부트 서버를 자동으로 실행하도록 명령을 내립니다.
ENTRYPOINT ["java", "-jar", "app.jar"]