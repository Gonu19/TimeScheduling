# 🚀 Project Context & Spec Sheet: 일정 조율 및 근무 배정 자동화 시스템

## 1. 기술적 컨텍스트 (Technical Context)

- **Frontend:** React (Vite 기반), Tailwind CSS
    
- **Backend:** Spring Boot (Java 21), Spring Data JPA
    
- **Database:** MySQL
    
- **Deployment:** Google Cloud Run (Antigravity Cloud Run MCP Server 활용), Cloud SQL
    
- **AI Agent Role:** 당신(Antigravity)은 단순한 코드 생성기가 아니라, 아키텍처를 이해하고 인프라 배포까지 수행하는 주도적인 시스템 액터(System Actor)입니다.
    

## 2. 핵심 기능적 목표 (Functional Goals)

본 시스템은 대학생 및 직장인을 위한 익명 기반 팀 협업 스케줄링 서비스입니다.

- **UC-01~03 (팀 및 역할 설정):** OAuth/회원가입 없이 UUID 기반 익명 세션을 생성합니다. 팀 생성 시 목적을 '회의(Meeting)' 또는 '근무(Work)'로 설정합니다.
    
- **UC-04 (가용 시간 입력):** 사용자는 30분 단위 그리드를 드래그하여 가용 시간을 입력합니다.
    
- **UC-05~06 (알고리즘 추천 엔진):** 입력된 데이터를 바탕으로 3가지 추천안(1. 최대 참석률, 2. 목표 인원 충족 및 평준화, 3. 연속성 극대화)을 자동 연산하여 반환합니다.
    
- **UC-07 (최종 확정):** 관리자가 추천안 중 하나를 확정하면 결과를 대시보드에 시각화합니다.
    

## 3. 필수 제약 조건 및 예외 처리 (Constraints & Off-limits)

- **비트 연산 최적화 (Critical):** 30분 단위 48개 타임 슬롯은 데이터베이스에 `DATETIME` 범위가 아닌 64비트 정수형(`BIGINT`) 비트마스킹 값 하나로 인코딩되어 저장되어야 합니다.
    
- **트랜잭션 및 동시성 제어:** 스케줄 최종 확정 시(UC-07), 팀원의 가용 시간 기습 수정으로 인한 데이터 오염을 막기 위해 JPA 낙관적 락(`@Version`)을 적용해야 합니다.
    
- **생명주기 자동화:** 서버 어플리케이션 코드가 아닌 MySQL 내부의 Event Scheduler 기능과 `ON DELETE CASCADE`를 사용하여 만료된 세션과 데이터를 자율적으로 삭제(Purge)해야 합니다.
    
- **예외 방어:** 가용 시간이 단 1슬롯도 겹치지 않는 제약 조건 충돌 상황 발생 시, 무한 루프를 방지하고 조기 중단(Early-exit) 후 리포트를 반환하도록 설계하세요.
    

## 4. 바이브 코딩 워크플로우 규칙 (Agent Workflow Rules)

AI 에이전트인 당신은 다음의 워크플로우를 엄격히 준수해야 합니다.

1. **Plan First:** 코드를 작성하기 전에 반드시 마크다운 형식으로 구현 계획(Plan)을 제시하고 사용자의 승인을 받으세요.
    
2. **Self-Review Mode:** 코드를 생성한 직후, 스스로 보안 취약점, 성능 병목, 예외 처리 누락 여부를 검토하여 최적화하세요.
    
3. **Atomic Commits:** 하나의 기능 구현이나 오류 수정이 완료될 때마다 즉시 독립적인 버전으로 커밋(Commit)하여 안전한 복원 지점을 확보하세요.
    
4. **Vibe Deploying:** 배포 단계에서는 복잡한 설정 없이 Cloud Run MCP 서버를 활용하여 컨테이너 빌드 및 배포를 자동화하세요.
    