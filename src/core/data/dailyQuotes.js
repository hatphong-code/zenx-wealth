// Seed data — Start Late, Finish Rich (David Bach)
// templates: array of template IDs, or ['all'] for universal quotes
// themes: used for admin filtering

export const QUOTE_THEMES = ['mindset', 'latte_factor', 'savings', 'debt', 'emergency', 'investing', 'family', 'action'];

export const QUOTE_TEMPLATES = ['all', 'student', 'young_pro', 'family', 'late_starter', 'mid_career'];

export const QUOTE_SOURCE = 'Start Late, Finish Rich — David Bach';

export const seedQuotes = [
  // ── MINDSET: Late starters ──
  {
    id: 'q01',
    en: 'Starting late does not mean finishing last. The race is not over until you stop running.',
    vi: 'Bắt đầu muộn không có nghĩa là về đích sau. Cuộc đua chỉ kết thúc khi bạn dừng lại.',
    themes: ['mindset'],
    templates: ['late_starter', 'family'],
  },
  {
    id: 'q02',
    en: "You didn't start late. Life happened. But right now, today — you have a choice.",
    vi: 'Bạn không phải cố tình bắt đầu muộn. Cuộc sống đã xảy ra như vậy. Nhưng ngay lúc này — bạn có một lựa chọn.',
    themes: ['mindset'],
    templates: ['late_starter'],
  },
  {
    id: 'q03',
    en: 'Regret about the past is expensive. Redirect that energy into action today.',
    vi: 'Hối tiếc về quá khứ là tốn kém. Hãy chuyển hóa năng lượng đó thành hành động ngay hôm nay.',
    themes: ['mindset', 'action'],
    templates: ['late_starter', 'family'],
  },
  {
    id: 'q04',
    en: 'A 50-year-old who starts saving today will still be better off than one who waits until 55.',
    vi: 'Người 50 tuổi bắt đầu tiết kiệm hôm nay vẫn sẽ tốt hơn người chờ đến 55 tuổi mới bắt đầu.',
    themes: ['mindset', 'savings'],
    templates: ['late_starter'],
  },
  {
    id: 'q05',
    en: 'You may have lost time, but you have gained wisdom. Use both well.',
    vi: 'Bạn có thể đã mất thời gian, nhưng bạn đã tích lũy được sự khôn ngoan. Hãy dùng cả hai thật tốt.',
    themes: ['mindset'],
    templates: ['late_starter', 'mid_career'],
  },
  {
    id: 'q06',
    en: 'The person who starts at 50 and saves aggressively will do better than the one who started at 30 and stopped.',
    vi: 'Người bắt đầu ở tuổi 50 và tiết kiệm quyết liệt vẫn làm tốt hơn người bắt đầu ở tuổi 30 rồi bỏ cuộc.',
    themes: ['mindset', 'savings'],
    templates: ['late_starter'],
  },
  // ── MINDSET: Universal ──
  {
    id: 'q07',
    en: "It's not about how much money you make — it's about how much you keep.",
    vi: 'Không phải bạn kiếm được bao nhiêu — mà là bạn giữ lại được bao nhiêu.',
    themes: ['mindset'],
    templates: ['all'],
  },
  {
    id: 'q08',
    en: 'The best time to start was yesterday. The second best time is today.',
    vi: 'Thời điểm tốt nhất để bắt đầu là ngày hôm qua. Thời điểm tốt thứ hai là ngay hôm nay.',
    themes: ['mindset'],
    templates: ['all'],
  },
  {
    id: 'q09',
    en: 'Finishing rich is not about luck. It is about decisions made consistently over time.',
    vi: 'Về đích giàu có không phải chuyện may mắn. Đó là những quyết định đúng đắn được thực hiện đều đặn theo thời gian.',
    themes: ['mindset'],
    templates: ['all'],
  },
  {
    id: 'q10',
    en: 'Stop waiting for the perfect moment. The perfect moment is costing you thousands.',
    vi: 'Đừng chờ thời điểm hoàn hảo. Mỗi ngày chờ đó đang tiêu tốn của bạn một khoản tiền thực sự.',
    themes: ['mindset', 'action'],
    templates: ['all'],
  },
  // ── LATTE FACTOR ──
  {
    id: 'q11',
    en: 'Find your Latte Factor. We all have one — a small daily habit that, if redirected, could change your financial life.',
    vi: "Tìm ra 'Latte Factor' của bạn. Ai cũng có một thứ như vậy — một thói quen chi tiêu nhỏ mỗi ngày mà nếu điều chỉnh lại, có thể thay đổi cuộc sống tài chính của bạn.",
    themes: ['latte_factor'],
    templates: ['all'],
  },
  {
    id: 'q12',
    en: "It's not about giving up your coffee. It's about knowing where your money goes before it disappears.",
    vi: 'Không phải là từ bỏ cà phê. Mà là biết tiền của bạn đi đâu trước khi nó biến mất.',
    themes: ['latte_factor', 'action'],
    templates: ['student', 'young_pro'],
  },
  {
    id: 'q13',
    en: 'Small leaks sink great ships. Find yours before it is too late.',
    vi: "Những lỗ rò nhỏ nhấn chìm những con tàu lớn. Hãy tìm ra lỗ rò của bạn trước khi quá muộn.",
    themes: ['latte_factor'],
    templates: ['all'],
  },
  {
    id: 'q14',
    en: 'Saving a small amount each day is not about the number. It is about proving to yourself that you are in control.',
    vi: 'Tiết kiệm một khoản nhỏ mỗi ngày không phải về con số. Đó là để chứng minh với bản thân rằng bạn đang làm chủ tài chính của mình.',
    themes: ['latte_factor', 'savings'],
    templates: ['student', 'young_pro', 'late_starter'],
  },
  // ── SAVINGS / PAY YOURSELF FIRST ──
  {
    id: 'q15',
    en: 'Pay yourself first. Not what is left over — first.',
    vi: 'Trả cho bản thân trước. Không phải phần còn lại — mà là trước tiên.',
    themes: ['savings'],
    templates: ['all'],
  },
  {
    id: 'q16',
    en: 'Automatic savings is the single most powerful financial habit you can build. Set it up and let it run.',
    vi: 'Tiết kiệm tự động là thói quen tài chính mạnh mẽ nhất bạn có thể xây dựng. Thiết lập nó và để nó tự chạy.',
    themes: ['savings', 'action'],
    templates: ['all'],
  },
  {
    id: 'q17',
    en: 'Start with 1% of your income. Then 2%. Then 3%. Progress is the point, not perfection.',
    vi: 'Bắt đầu với 1% thu nhập. Rồi 2%. Rồi 3%. Tiến bộ mới là điểm mấu chốt, không phải sự hoàn hảo.',
    themes: ['savings'],
    templates: ['student', 'young_pro'],
  },
  {
    id: 'q18',
    en: 'When you are starting late, saving aggressively is not extreme — it is necessary. And it is possible.',
    vi: 'Khi bắt đầu muộn, tiết kiệm quyết liệt không phải là cực đoan — đó là điều cần thiết. Và hoàn toàn có thể làm được.',
    themes: ['savings'],
    templates: ['late_starter'],
  },
  // ── EMERGENCY FUND ──
  {
    id: 'q19',
    en: 'Your emergency fund is not money sitting idle. It is a wall protecting everything you have built.',
    vi: 'Quỹ dự phòng không phải tiền nhàn rỗi. Đó là bức tường bảo vệ tất cả những gì bạn đã xây dựng.',
    themes: ['emergency'],
    templates: ['all'],
  },
  {
    id: 'q20',
    en: 'Without a safety net, one bad month can undo years of good decisions.',
    vi: 'Không có quỹ dự phòng, một tháng xui xẻo có thể xóa bỏ nhiều năm quyết định đúng đắn.',
    themes: ['emergency'],
    templates: ['all'],
  },
  {
    id: 'q21',
    en: 'Six months of expenses in the bank is not a luxury. After 40, it is non-negotiable.',
    vi: 'Sáu tháng chi phí sinh hoạt trong tài khoản không phải xa xỉ. Sau tuổi 40, đó là điều không thể thỏa hiệp.',
    themes: ['emergency'],
    templates: ['late_starter', 'family', 'mid_career'],
  },
  {
    id: 'q22',
    en: 'An emergency fund does not just protect your finances — it protects your decisions. Desperation leads to bad choices.',
    vi: 'Quỹ dự phòng không chỉ bảo vệ tài chính — nó bảo vệ những quyết định của bạn. Sự tuyệt vọng dẫn đến những lựa chọn tồi.',
    themes: ['emergency', 'mindset'],
    templates: ['family', 'late_starter'],
  },
  // ── DEBT ──
  {
    id: 'q23',
    en: 'Debt is a thief. It steals from your future self every single month.',
    vi: 'Nợ là kẻ trộm. Nó cướp đi tương lai của bạn mỗi tháng một lần.',
    themes: ['debt'],
    templates: ['all'],
  },
  {
    id: 'q24',
    en: 'The fastest way to build wealth is to stop paying interest to someone else.',
    vi: 'Con đường nhanh nhất để xây dựng tài sản là ngừng trả lãi cho người khác.',
    themes: ['debt'],
    templates: ['late_starter', 'young_pro', 'family'],
  },
  {
    id: 'q25',
    en: 'Debt freedom is not just a financial goal. It is a life goal. Everything gets easier when you owe nothing.',
    vi: 'Thoát nợ không chỉ là mục tiêu tài chính. Đó là mục tiêu sống. Mọi thứ đều dễ dàng hơn khi bạn không còn nợ ai.',
    themes: ['debt'],
    templates: ['late_starter', 'family'],
  },
  {
    id: 'q26',
    en: 'You cannot build a solid foundation on borrowed ground. Get out of debt first.',
    vi: 'Bạn không thể xây nền móng vững chắc trên mảnh đất đi mượn. Hãy thoát nợ trước.',
    themes: ['debt'],
    templates: ['late_starter', 'young_pro'],
  },
  // ── FAMILY ──
  {
    id: 'q27',
    en: 'Your children will learn how to handle money by watching you handle yours.',
    vi: 'Con cái bạn sẽ học cách xử lý tiền bạc bằng cách nhìn bạn xử lý tiền của mình.',
    themes: ['mindset', 'family'],
    templates: ['family'],
  },
  {
    id: 'q28',
    en: 'You cannot pour from an empty cup. Secure your own finances before you can truly help your family.',
    vi: 'Bạn không thể rót từ một chiếc cốc rỗng. Hãy đảm bảo tài chính của bản thân trước khi thực sự giúp được gia đình.',
    themes: ['mindset'],
    templates: ['family'],
  },
  {
    id: 'q29',
    en: 'The greatest gift you can give your family is not money — it is financial security.',
    vi: 'Món quà lớn nhất bạn có thể trao cho gia đình không phải là tiền — mà là sự an toàn tài chính.',
    themes: ['mindset', 'family'],
    templates: ['family', 'mid_career'],
  },
  // ── YOUNG (student / young_pro) ──
  {
    id: 'q30',
    en: 'You have one thing no late starter has: time. Do not waste it thinking you have more.',
    vi: 'Bạn có thứ mà người bắt đầu muộn không còn: thời gian. Đừng lãng phí nó với suy nghĩ rằng bạn vẫn còn nhiều.',
    themes: ['mindset'],
    templates: ['student', 'young_pro'],
  },
  {
    id: 'q31',
    en: 'Your habits in your 20s will define your options in your 40s.',
    vi: 'Những thói quen của bạn ở tuổi 20 sẽ quyết định những lựa chọn bạn có ở tuổi 40.',
    themes: ['mindset'],
    templates: ['student', 'young_pro'],
  },
  {
    id: 'q32',
    en: 'Compound interest works for you or against you. The only question is: which side are you on?',
    vi: 'Lãi kép làm việc cho bạn hoặc chống lại bạn. Câu hỏi duy nhất là: bạn đang đứng về phía nào?',
    themes: ['investing', 'mindset'],
    templates: ['student', 'young_pro'],
  },
  // ── MID CAREER ──
  {
    id: 'q33',
    en: 'At midlife, the goal shifts from growing income to protecting what you have grown.',
    vi: 'Ở độ tuổi trung niên, mục tiêu chuyển từ tăng thu nhập sang bảo vệ những gì bạn đã xây dựng.',
    themes: ['mindset', 'investing'],
    templates: ['mid_career'],
  },
  {
    id: 'q34',
    en: 'Passive income is not a dream. It is a strategy. Build it deliberately, one asset at a time.',
    vi: 'Thu nhập thụ động không phải giấc mơ. Đó là một chiến lược. Hãy xây dựng nó có chủ đích, từng tài sản một.',
    themes: ['investing'],
    templates: ['mid_career', 'family'],
  },
  {
    id: 'q35',
    en: 'After 40, every year you delay investing costs you more than the year before.',
    vi: 'Sau 40 tuổi, mỗi năm bạn trì hoãn đầu tư sẽ tốn kém hơn năm trước đó.',
    themes: ['investing', 'savings'],
    templates: ['mid_career', 'late_starter'],
  },
  // ── ACTION & SYSTEM ──
  {
    id: 'q36',
    en: 'Automate. Simplify. Repeat. That is the entire wealth-building system.',
    vi: 'Tự động hóa. Đơn giản hóa. Lặp lại. Đó là toàn bộ hệ thống xây dựng tài sản.',
    themes: ['action'],
    templates: ['all'],
  },
  {
    id: 'q37',
    en: 'A financial plan you do not follow is just a wish list.',
    vi: 'Một kế hoạch tài chính mà bạn không thực hiện chỉ là một danh sách ước muốn.',
    themes: ['action'],
    templates: ['all'],
  },
  {
    id: 'q38',
    en: 'Financial freedom is not complicated. But it does require showing up, consistently, day after day.',
    vi: 'Tự do tài chính không phức tạp. Nhưng nó đòi hỏi bạn phải kiên trì, ngày qua ngày, không ngừng nghỉ.',
    themes: ['mindset', 'action'],
    templates: ['all'],
  },
  {
    id: 'q39',
    en: 'The goal is not to be perfect with money. The goal is to be consistent.',
    vi: 'Mục tiêu không phải là hoàn hảo với tiền bạc. Mục tiêu là nhất quán.',
    themes: ['mindset', 'action'],
    templates: ['all'],
  },
  {
    id: 'q40',
    en: 'Track your spending for one week. You will learn more about yourself than any financial book can teach.',
    vi: 'Theo dõi chi tiêu của bạn trong một tuần. Bạn sẽ hiểu về bản thân hơn bất kỳ cuốn sách tài chính nào có thể dạy.',
    themes: ['action', 'latte_factor'],
    templates: ['all'],
  },
];
