| index               |       기능        | HTTP Method |                          API PATH                           | 개발 상태 | 백링크                                     |
| ------------------- | :-------------: | :---------: | :---------------------------------------------------------: | ----- | --------------------------------------- |
| 팀 생성 및 접속(가제)       |      방 생성       |    POST     |                        /api/sessions                        | 개발 후  | [[1.1 Team Generation]]                 |
|                     |      유저 접속      |     GET     |                  /api/sessions/{sessionId}                  | 개발 후  | [[1.2 Team Inquiry]]                    |
|                     |     관리자 인증      |    POST     |           /api/sessions/{sessionId}/verify-admin            | 개발 후  | [[1.3 Admin Authentication]]            |
|                     |    근무 요건 등록     |     PUT     |           /api/sessions/{sessionId}/requirements            | 개발 후  | [[1.4 Shift Requirement]]               |
| 가용시간 등록(가제)         |     가용시간 등록     |     PUT     | /api/sessions/{sessionId}/members/{memberId}/availabilities | 개발 후  | [[2.1 Update availabilities]]           |
|                     |  이전 가용시간 불러오기   |     GET     | /api/sessions/{sessionId}/members/{memberId}/availabilities | 개발 후  | [[2.2  Load Member Availability]]       |
| 스케줄 추천안 도출 및 확정(가제) | 회의 추천안 도출 및 제시  |     GET     |          /api/sessions/{sessionId}/recommendations          | 개발 후  | [[3.1 Meeting Schedule Recommendation]] |
|                     |    스케줄 최종 확정    |    POST     |              /api/sessions/{sessionId}/confirm              | 개발 후  | [[3.2 Schedule confirmed]]              |
|                     | 근무 추천안 도출 및 제시  |     GET     |       /api/sessions/{sessionId}/work-recommendations        | 개발 후 | [[3.3 Work Schedule Recommendation]]    |
| 결과 조회               |  최종 확정 스케줄 조회   |     GET     |              /api/sessions/{sessionId}/result               | 개발 후  | [[4.1 Confirmed Schedule Inquiry]]      |