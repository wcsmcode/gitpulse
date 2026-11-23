# Hướng Dẫn Sử Dụng GitPulse (DevBounty)

**GitPulse** là nền tảng quản lý công việc và treo thưởng vi mô (Micro-Bounty) dành cho các nhóm phát triển phần mềm. Thay vì để các lỗi (bug) hoặc tính năng tồn đọng bị ngâm lâu ngày, người quản lý dự án có thể gắn điểm thưởng **XP** cho từng đầu việc (Issue) để khuyến khích các lập trình viên chủ động nhận việc, xử lý và tích lũy điểm uy tín trên bảng xếp hạng.

---

## 1. Các vai trò trong hệ thống

GitPulse không chia cứng tài khoản thành "Admin" hay "User" cố định. Thay vào đó, quyền hạn của bạn được quyết định **theo từng không gian làm việc (Workspace)** mà bạn tham gia:

* **Owner (Chủ sở hữu):** Người khởi tạo Workspace. Có toàn quyền quản lý thành viên, liên kết kho lưu trữ (Repository), tạo Issue, treo thưởng và duyệt trả điểm XP.
* **Maintainer (Người điều phối):** Được Owner ủy quyền quản lý chuyên môn. Có quyền liên kết Repository, đăng Issue treo thưởng, thu hồi việc nếu làm quá hạn và duyệt bài nộp để trả XP.
* **Developer (Lập trình viên):** Thành viên tham gia giải quyết công việc. Có quyền xem danh sách Issue, nhận kèo (Claim), thảo luận, nộp kết quả và tích lũy điểm XP.

> *Lưu ý: Một tài khoản có thể vừa là **Owner** ở dự án do mình lập ra, vừa là **Developer** khi tham gia hỗ trợ ở dự án của người khác.*

---

## 2. Bắt đầu sử dụng

### Bước 1: Đăng ký & Đăng nhập
1. Truy cập trang chủ GitPulse và nhấn **Get Started** (hoặc **Sign In** nếu đã có tài khoản).
2. Điền **Email**, **Họ tên** và **Mật khẩu** để khởi tạo hồ sơ lập trình viên (mặc định bắt đầu với `0 XP`).

### Bước 2: Tạo hoặc chọn Workspace
* **Tạo Workspace mới:** Nhấn vào thanh chọn Workspace ở góc trên cùng bên trái màn hình -> chọn **+ Create New Workspace** -> nhập tên dự án và mô tả ngắn. Bạn sẽ tự động trở thành **Owner** của Workspace này.
* **Chuyển đổi Workspace:** Nếu bạn tham gia nhiều dự án cùng lúc, hãy nhấn vào tên Workspace ở góc trên bên trái để chuyển qua lại giữa các không gian làm việc.

---

## 3. Hướng dẫn dành cho Owner & Maintainer

### 3.1. Liên kết kho lưu trữ GitHub (Repositories)
Trước khi giao việc, bạn cần khai báo cho GitPulse biết dự án đang làm việc trên những kho mã nguồn nào:
1. Ở thanh menu bên trái, chọn **Repo & Settings**.
2. Tại mục **Link Additional GitHub Repository**, nhập định danh kho lưu trữ theo cú pháp `tên-chủ-sở-hữu/tên-repo` (ví dụ: `wcsmcode/productive_os`) và nhấn **+ Link Repository**.
3. Bạn có thể liên kết **nhiều Repository** vào cùng một Workspace. Nhấn nút **Sync** bất cứ lúc nào để cập nhật số lượt sao (Stars) và thông tin mới nhất từ GitHub.

### 3.2. Mời thành viên vào nhóm
1. Vẫn tại trang **Repo & Settings**, kéo xuống mục **Team Members**.
2. Nhập **Email** của thành viên muốn mời (người này cần đã đăng ký tài khoản trên GitPulse), chọn vai trò (`Developer` hoặc `Maintainer`) và nhấn **Add Member**.

### 3.3. Tạo Issue và treo thưởng XP
1. Nhấn nút **+ New Issue** ở thanh công cụ phía trên.
2. Điền đầy đủ thông tin:
   * **Repository:** Chọn kho mã nguồn liên quan đến đầu việc này.
   * **Tiêu đề & Mô tả:** Ghi rõ yêu cầu kỹ thuật hoặc lỗi cần sửa.
   * **Độ ưu tiên (Priority) & Nhãn (Tags):** Phân loại mức độ quan trọng (`Low`, `Medium`, `High`, `Critical`).
   * **Mức thưởng (Bounty Points):** Nhập số điểm **XP** tương xứng với độ khó của công việc.
3. Nhấn lưu để đưa Issue lên cột **Open** trên bảng công việc.

### 3.4. Kiểm duyệt bài nộp & Trả thưởng
1. Theo dõi các thẻ công việc nằm ở cột **In Review** trên bảng **Bounties Board**.
2. Nhấn vào thẻ Issue để mở khung chi tiết và đọc phần bình luận nhằm kiểm tra đường dẫn Pull Request (PR) mà Developer đã nộp.
3. Thực hiện một trong hai thao tác:
   * **Approve & Pay:** Nếu mã nguồn đạt yêu cầu, nhấn duyệt để đóng Issue. Hệ thống sẽ ngay lập tức chuyển toàn bộ số XP treo thưởng vào tài khoản của Developer.
   * **Từ chối / Yêu cầu sửa lại:** Để lại bình luận góp ý để Developer tiếp tục chỉnh sửa.
   * **Thu hồi việc (Unassign):** Nếu một Developer đã nhận Issue ở cột **In Progress** nhưng ngâm việc quá lâu không thực hiện, bạn có quyền thu hồi để đưa Issue quay lại trạng thái **Open** cho người khác nhận.

---

## 4. Hướng dẫn dành cho Developer

### 4.1. Tìm kiếm và nhận việc (Claim Bounty)
1. Vào mục **Bounties Board** ở thanh menu bên trái.
2. Sử dụng thanh tìm kiếm phía trên hoặc bộ lọc theo nhãn/độ ưu tiên để tìm các Issue đang ở trạng thái **Open** phù hợp với khả năng.
3. Nhấn vào Issue muốn làm và bấm **Claim Bounty**. Thẻ công việc sẽ chuyển sang cột **In Progress** và gắn tên bạn làm người phụ trách.

### 4.2. Thực hiện và nộp bài (Submit for Review)
1. Truy cập kho mã nguồn GitHub được gắn trên thẻ Issue, tiến hành viết mã nguồn và tạo Pull Request trên GitHub như quy trình thông thường.
2. Quay lại GitPulse, mở chi tiết thẻ Issue đang làm, dán **đường dẫn Pull Request (PR Link)** vào ô bình luận kèm ghi chú ngắn gọn.
3. Nhấn **Submit for Review** để đẩy thẻ sang cột **In Review**, thông báo cho Maintainer vào kiểm tra.

### 4.3. Theo dõi XP & Bảng xếp hạng
* Tổng số **XP** hiện có của bạn luôn hiển thị ở góc trên bên phải màn hình.
* Truy cập mục **Leaderboard** ở thanh menu bên trái để xem thứ hạng đóng góp của bản thân so với các thành viên khác trong hệ thống.

---

## 5. Tóm tắt vòng đời một Issue

Mọi đầu việc trên GitPulse đều đi qua 4 giai đoạn khép kín trên bảng Kanban:

1. **`OPEN` (Mở):** Issue vừa được Maintainer tạo và gắn thưởng XP, đang chờ người nhận.
2. **`IN PROGRESS` (Đang thực hiện):** Đã có một Developer nhận kèo và đang xử lý.
3. **`IN REVIEW` (Chờ duyệt):** Developer đã hoàn thành, nộp link Pull Request và đang chờ Maintainer kiểm tra.
4. **`CLOSED` (Hoàn thành):** Maintainer đã nghiệm thu, Issue được đóng lại và điểm XP đã được cộng vào hồ sơ của Developer.

---

## 6. Các quy tắc vận hành cốt lõi

* **Không tự tạo tự duyệt:** Người tạo Issue hoặc người bấm duyệt trả thưởng không thể đồng thời là người nhận thưởng của chính Issue đó.
* **Độc quyền xử lý:** Tại một thời điểm, mỗi Issue chỉ thuộc về một Developer duy nhất để tránh tình trạng làm trùng lặp công sức.
* **Thanh toán minh bạch:** Điểm XP chỉ được cộng khi Issue chính thức chuyển sang trạng thái `CLOSED` thông qua thao tác phê duyệt của Maintainer/Owner, và mỗi Issue chỉ trả thưởng một lần duy nhất.