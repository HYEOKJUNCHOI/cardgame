# TASK

진행률: 100%

- [x] React/Vite 프로젝트 생성
- [x] 이미지 생성: 배경, 카드 앞면, 카드 뒷면
- [x] 생성 카드의 흰색/체커보드 외곽 제거 및 투명 PNG 정리
- [x] 8개 나라 실루엣 PNG 생성
- [x] 8개 국기 PNG 로컬 에셋 적용
- [x] 게임 로직 및 이미지 레이어 UI 구현
- [x] lint/build
- [x] 짧은 PC 화면 시각 검수
- [x] 실루엣 카드/국기 카드 앞면 검수
- [x] 8쌍 자동 플레이 및 완료 모달 검증
- [x] 이미지 로드/가로 오버플로 검증

## 검증 증거
- `npm run lint`: 0 warnings, 0 errors
- `npm run build`: Vite production build 성공
- production preview: `http://localhost:4178`
- React root mounted: true
- cards: 16
- 8쌍 완료 후 matched cards: 16, dialog: true
- broken images: 0
- 1280px viewport: `scrollWidth === clientWidth` (가로 오버플로 없음)
- 실루엣/국기/한글 이름/ISO 코드 실제 렌더링 확인
