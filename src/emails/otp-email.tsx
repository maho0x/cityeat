import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function OtpEmail({ otp }: { otp: string }) {
  return (
    <Html lang="zh-HK">
      <Head />
      <Preview>你的 City 食咩好 驗證碼：{otp}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f5f4",
          fontFamily:
            "-apple-system, 'Segoe UI', 'Noto Sans TC', 'PingFang HK', sans-serif",
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: "32px 28px",
            maxWidth: 440,
          }}
        >
          <Text
            style={{
              color: "#A6192E",
              fontWeight: 700,
              fontSize: 15,
              margin: 0,
            }}
          >
            City 食咩好
          </Text>
          <Heading style={{ fontSize: 22, margin: "16px 0 8px" }}>
            你的登入驗證碼 · Your sign-in code
          </Heading>
          <Section
            style={{
              backgroundColor: "#f6f5f4",
              borderRadius: 12,
              padding: "18px 0",
              textAlign: "center",
              margin: "20px 0",
            }}
          >
            <Text
              style={{
                fontSize: 34,
                letterSpacing: 10,
                fontWeight: 700,
                margin: 0,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              {otp}
            </Text>
          </Section>
          <Text style={{ color: "#6b6b6b", fontSize: 14, lineHeight: "22px" }}>
            驗證碼 5 分鐘內有效。如果不是你本人操作，請忽略此郵件。
            <br />
            This code expires in 5 minutes. If you didn&apos;t request it, you
            can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
