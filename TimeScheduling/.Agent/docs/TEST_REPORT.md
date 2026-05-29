# Schedule Recommendation System: Unit Test Report

## 1. Background & Objective
본 프로젝트는 초기 개발 단계에서부터 결함을 발견하고 해결하는 소프트웨어 공학의 **'Shift-Left(왼쪽 옮김)' 사상**을 적극 도입하였습니다. 
특히 스케줄링 추천 시스템의 핵심 로직인 **Bitwise operation(비트 논리 연산)**은 구현상 매우 효율적이지만, 인덱스와 시간대 매핑 과정에서 **Off-by-one error(단위 오차)**와 같은 엣지 케이스 결함이 발생하기 쉽습니다. 이러한 잠재적 위험을 사전에 차단하고 비즈니스 로직의 완전성을 보장하기 위해 본 단위 테스트(Unit Test)를 작성하게 되었습니다.

## 2. Key Test Scenarios
시스템의 신뢰성을 증명하기 위해 일반적인 성공 케이스(Happy path)를 넘어, 시스템 장애를 유발할 수 있는 극한의 엣지 케이스(Edge case)를 중심으로 테스트 시나리오를 구성했습니다.

*   **전원 불일치 (교집합 0)**: 참여자들의 가용 시간이 전혀 겹치지 않는 극단적인 상황을 검증했습니다. Bitwise 연산이 오류를 던지지 않고 안전하게 `0L` 배열을 반환하며 빈 추천안을 생성할 수 있는지 확인했습니다.
*   **`isMandatory` (필참 멤버) 조건 연산**: 필참 멤버와 일반 멤버가 혼재된 상황에서 시스템이 요구사항에 맞게 필참 멤버(`isMandatory == true`)의 시간만을 정확하게 필터링하여 우선 연산하는지 검증했습니다.
*   **Boundary Value (경계값) 디코딩 테스트**: 비트 인덱스 변환 로직(`extractActiveTimes`)에서 발생하기 쉬운 경계값 오류를 검증하기 위해, 최상단 비트(인덱스 0 = `00:00`)와 최하단 비트(인덱스 47 = `23:30`)를 입력하여 문자열 파싱 시 어떠한 오차(Off-by-one error)도 발생하지 않음을 증명했습니다.

## 3. Technical Decisions
테스트 환경을 구성하며 다음과 같은 기술적 의사결정을 내렸습니다.

*   **Mockito를 활용한 Test Isolation (테스트 격리)**: `@SpringBootTest`를 사용하여 무거운 Spring Application Context를 전체 로드하는 대신, `@ExtendWith(MockitoExtension.class)`와 `@InjectMocks`를 통해 필요한 Service Layer만을 메모리에 띄웠습니다. `ParticipantScheduleRepository` 등 외부 의존성을 Mocking함으로써 테스트 격리성을 확보하고 빠르고 가벼운 CI 파이프라인 구동 환경을 구축했습니다.
*   **Given-When-Then 패턴과 AssertJ 활용**: 모든 테스트 코드의 구조를 `Given-When-Then` 패턴으로 표준화하여 다른 개발자가 읽었을 때 로직의 흐름을 직관적으로 이해할 수 있도록 구성했습니다. 또한, JUnit 기본 Assertion 대신 `AssertJ`의 Fluent API를 사용하여 테스트 코드의 가독성(Readability)을 극대화했습니다.

## 4. Impact & Insights
결론적으로 본 테스트 케이스를 통해 TimeScheduling 백엔드 시스템은 어떠한 비정상적인 데이터나 경계값 상황에서도 흔들리지 않는 **견고함(Robustness)**을 확보하게 되었습니다.

이는 다가오는 **Frontend(React) 애플리케이션 연동** 단계에서 강력한 협업적 이점을 제공합니다. 만약 프론트엔드 연동 중 예상치 못한 스케줄링 추천 결과가 발생하더라도, 백엔드의 핵심 비즈니스 로직은 테스트 코드를 통해 무결성이 입증되었기 때문에 **원인 추적(Debugging) 범위를 API 통신 계층이나 프론트엔드 렌더링 영역으로 단번에 좁힐 수 있습니다.** 
결과적으로 이는 전체 팀의 개발 속도와 생산성을 비약적으로 끌어올리는 토대가 될 것입니다.
