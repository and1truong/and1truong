# Cách tận dụng quota GPT-5.3 Codex Spark hiệu quả

## Nguyên tắc

Dùng Spark như một đội worker tốc độ cao cho các công việc:

- Nhiều lượt, phạm vi rõ ràng.
- Có thể kiểm chứng bằng test, typecheck, lint hoặc diff.
- Sai sót dễ phát hiện và hoàn tác.
- Không đòi hỏi quyết định kiến trúc lớn ngay từ đầu.

Dùng model mạnh hơn như GPT-5.6 hoặc Sonnet để:

- Chọn giữa nhiều phương án.
- Review thay đổi quan trọng.
- Đánh giá kiến trúc và trade-off.
- Xử lý những lỗi khó, mơ hồ hoặc có blast radius lớn.

## Các việc phù hợp với Spark

- Quét repo theo module để tìm bug, dead code, TODO, duplicate logic và dependency cũ.
- Sinh unit test, integration test, edge case và property-based/fuzz test.
- Thực hiện refactor cơ học: rename, split file, type hints, docstring, error handling.
- Review từng commit hoặc PR về correctness, race condition, security và performance.
- Viết CLI, migration, log parser, script data cleanup và automation.
- Chuyển tài liệu thành code mẫu, benchmark hoặc playground.
- Repo archaeology: giải thích kiến trúc, call graph, luồng dữ liệu và viết onboarding notes.
- Cho nhiều agent giải độc lập cùng một bài toán, sau đó dùng model mạnh chọn hoặc tổng hợp lời giải.

## Workflow đề xuất

1. Inventory repo và chia thành các module có phạm vi độc lập.
2. Với mỗi module, yêu cầu Spark tìm vấn đề và đưa bằng chứng cụ thể.
3. Ưu tiên theo thứ tự: bug, security, missing tests, unsafe assumptions, rồi mới đến refactor.
4. Mỗi thay đổi phải nhỏ, có mục tiêu rõ và có cách kiểm chứng.
5. Chạy targeted tests sau từng thay đổi; chạy toàn bộ suite ở các checkpoint.
6. Ghi progress log gồm phát hiện, thay đổi, kết quả kiểm chứng và phần còn nghi ngờ.
7. Chuyển các thay đổi rủi ro cao hoặc ảnh hưởng kiến trúc sang model mạnh để review.
8. Không trộn nhiều thay đổi không liên quan trong cùng một commit.

## Prompt backlog mẫu

```text
Inspect this repository module by module.

For each module:

1. Explain its responsibility, public interfaces, dependencies, and data flow.
2. Identify concrete bugs, security risks, race conditions, unsafe assumptions,
   duplicated logic, dead code, outdated dependencies, and missing tests.
3. Rank findings by severity, confidence, and blast radius.
4. Provide evidence with exact file and line references.
5. Implement only high-confidence, low-risk fixes.
6. Add or update tests that reproduce each bug before fixing it.
7. Keep every change small and independently reviewable.
8. Run targeted tests after each change and the full test suite at checkpoints.
9. Do not perform architectural rewrites without explicit approval.
10. Maintain a progress log containing:
    - module inspected
    - findings
    - changes made
    - tests run
    - unresolved questions
    - recommended next action

Stop and request review when a change affects architecture, public APIs,
persistent data, authentication, authorization, concurrency, or deployment.
```

## Guardrails

- Không cho agent tự sửa mọi thứ nó phát hiện.
- Phân biệt rõ `finding`, `recommendation` và `implemented change`.
- Yêu cầu bằng chứng trước khi sửa.
- Không coi test do chính agent sinh ra là bằng chứng duy nhất về correctness.
- Tránh commit lớn với mô tả chung chung như “cleanup” hoặc “improvements”.
- Không tự nâng dependency lớn nếu chưa kiểm tra breaking changes.
- Không để nhiều worker cùng sửa một vùng code.
- Luôn giữ một model mạnh hoặc con người làm reviewer cuối.

## Cách “đốt quota” có giá trị nhất

Không nên giao một nhiệm vụ khổng lồ kiểu “cải thiện toàn bộ repo” rồi để agent chạy tự do. Hiệu quả hơn là duy trì một hàng đợi dài gồm các nhiệm vụ nhỏ, có tiêu chí hoàn thành rõ ràng và có thể kiểm chứng tự động.

Công thức tổng quát:

> Spark khám phá, tạo phương án và thực hiện thay đổi cơ học.  
> Test và tooling làm cổng kiểm soát.  
> Model mạnh hoặc con người quyết định kiến trúc và duyệt thay đổi cuối cùng.
