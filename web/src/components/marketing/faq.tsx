import { Section, SectionHeading } from "@/components/marketing/section"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { freeLimits, TRIAL_DAYS } from "@/config/pricing"

const faqs = [
  {
    q: "Dùng thử có cần nhập thẻ không?",
    a: `Không. Đăng ký xong là có ${TRIAL_DAYS} ngày Pro. Hết hạn tài khoản tự về gói Free, không có khoản phí nào tự trừ.`,
  },
  {
    q: "Hết thời gian dùng thử thì dữ liệu có mất không?",
    a: `Không bao giờ xoá. Gói Free xem rõ ${freeLimits.historyMonths} tháng gần nhất, khoản chi cũ hơn chỉ tạm khoá và mở lại ngay khi nâng Pro.`,
  },
  {
    q: "Ảnh của tôi có ai xem được không?",
    a: "Không. App không có tính năng chia sẻ hay mạng xã hội. Ảnh lưu ở chế độ riêng tư, chỉ mở được bằng đường link có chữ ký do máy chủ cấp riêng cho tài khoản của bạn, hết hạn sau 5 phút.",
  },
  {
    q: "Đã có app trên điện thoại chưa?",
    a: "App iOS và Android đang hoàn thiện. Trong lúc chờ, bạn dùng được ngay bản web: thêm khoản chi kèm ảnh, xem lịch và báo cáo. Khi app ra mắt, đăng nhập cùng tài khoản là thấy toàn bộ dữ liệu.",
  },
  {
    q: "Có dùng được khi không có mạng không?",
    a: "Chưa. Bản đầu cần có mạng để lưu ảnh và khoản chi. Chế độ offline nằm trong kế hoạch sau.",
  },
  {
    q: "App có hỗ trợ ngoại tệ không?",
    a: "Mặc định là VND. Mỗi khoản chi vẫn lưu loại tiền riêng; quy đổi nhiều loại tiền là tính năng Pro sẽ làm sau.",
  },
]

export function Faq() {
  return (
    <Section id="faq">
      <SectionHeading title="Hỏi đáp" />
      <Accordion type="single" collapsible className="mx-auto max-w-2xl">
        {faqs.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-pretty">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}
