# 📅 강강공고 - 단체 일정 조율의 혁신

**모두가 편한 시간을 찾아주는 스마트 스케줄링 플랫폼**

---

## 🚀 프로젝트 개요

강강공고는 **AI 기반 자동 스케줄 추천**과 **블록체인 기반 투명한 의사결정**을 결합한 차세대 단체 일정 관리 솔루션입니다. 복잡한 조율 과정을 단순화하고, 신뢰할 수 있는 방식으로 최적의 일정을 제안합니다.

## 💡 주요 특징

### 1. 🤖 스마트 추천 알고리즘
- 8가지 패턴 기반으로 3가지 맞춤형 추천안 자동 생성
- 가용시간 분석 및 우선순위 가중치 적용
- 실시간 추천 결과 피드백 시스템

### 2. 🔗 블록체인 투명성
- 모든 일정 변경사항을 블록체인에 기록
- 변경 내역 추적 및 검증 시스템
- 투명하고 신뢰할 수 있는 스케줄 관리

### 3. 👥 팀 관리 시스템
- 간편한 방(Session) 생성 및 참여
- 관리자/일반 사용자 역할 구분
- 실시간 사용자 동기화 및 알림

## 🛠️ 기술 스택

### Backend (Spring Boot)
- **Language:** Java 21
- **Framework:** Spring Boot 3.2.5
- **Database:** MySQL 8.0
- **ORM:** JPA, Hibernate
- **Security:** Spring Security
- **Blockchain:** Hyperledger Fabric SDK (SDK Integration)
- **Testing:** JUnit 5, Mockito

### Frontend (React)
- **Language:** TypeScript
- **Framework:** React 18
- **Library:** Redux Toolkit, React Router DOM
- **UI Components:** Material UI
- **Testing:** React Testing Library

## 📁 프로젝트 구조

```
TimeScheduling/
├── BackEnd/              # Spring Boot Backend (Java)
│   ├── src/main/java/com/example/timescheduling/
│   │   ├── controller/   # REST API Controllers
│   │   ├── service/      # Business Logic
│   │   ├── repository/   # Data Access Layer
│   │   ├── config/       # Configuration
│   │   └── dto/        # Data Transfer Objects
│   └── src/test/java/com/example/timescheduling/  # Unit Tests
│
└── FrontEnd/             # React Frontend (TypeScript)
    ├── src/components/   # Reusable Components
    ├── src/pages/        # Page Components
    ├── src/redux/        # State Management
    └── src/App.tsx       # Main Application
```

## 🚀 실행 방법

### Backend
```bash
cd TimeScheduling/BackEnd
./gradlew bootRun
```

### Frontend
```bash
cd TimeScheduling/FrontEnd
npm install
npm start
```

## 🤝 팀 협력 가이드

1. Git Branch: `feature/` 브랜치 사용
2. 커밋 메시지: Conventional Commits 형식 준수
3. PR 리뷰: 모든 PR은 2명 이상의 승인 필요
4. 테스트: 모든 기능 변경 시 테스트 코드 작성
