


| index               |       기능        | HTTP Method |                          API PATH                           | 개발 상태 | 백링크                                |
| ------------------- | :-------------: | :---------: | :---------------------------------------------------------: | ----- | ---------------------------------- |
| 팀 생성 및 접속(가제)       |      방 생성       |    POST     |                        /api/sessions                        | 개발 전  | [[1.1 Team Generation]]            |
|                     |      유저 접속      |     GET     |                  /api/sessions/{sessionId}                  | 개발 전  | [[1.2 Team Inquiry]]               |
| 가용시간 등록(가제)         |     가용시간 등록     |     PUT     | /api/sessions/{sessionId}/members/{memberId}/availabilities | 개발 전  | [[2.1 Update availabilities]]      |
|                     |  이전 가용시간 불러오기   |     GET     | /api/sessions/{sessionId}/members/{memberId}/availabilities | 개발 전  | [[2.2  Load Member Availability]]  |
| 스케줄 추천안 도출 및 확정(가제) | 3가지 추천안 도출 및 제시 |     GET     |          /api/sessions/{sessionId}/recommendations          | 개발 전  | [[3.1 Schedule Recommendation]]    |
|                     |    스케줄 최종 확정    |    POST     |              /api/sessions/{sessionId}/confirm              | 개발 전  | [[3.2 Schedule confirmed]]         |
| 결과 조회               |  최종 확정 스케줄 조회   |     GET     |              /api/sessions/{sessionId}/result               | 개발 전  | [[4.1 Confirmed Schedule Inquiry]] |
|                     | 스케줄 긴급 수정(관리자만) |    PATCH    |              /api/sessions/{sessionId}/result               | 개발 전  | [[4.2 Manual Overried]]            |
context 7
playwright