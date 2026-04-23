import { LoginForm, type LoginFeatures } from "@/components/login-form";

function readFeatures(): LoginFeatures {
  const smtp =
    Boolean(process.env.EMAIL_SERVER_HOST) &&
    Boolean(process.env.EMAIL_SERVER_USER) &&
    Boolean(process.env.EMAIL_SERVER_PASSWORD) &&
    Boolean(process.env.EMAIL_FROM);

  const demoEnabled = process.env.DEMO_LOGIN_ENABLED === "true";
  const demoEmail = (process.env.DEMO_LOGIN_EMAIL ?? "").trim();
  const demoName = (process.env.DEMO_LOGIN_NAME ?? "Демо").trim();
  const demoPasswordSet = Boolean(process.env.DEMO_LOGIN_PASSWORD);

  const gh =
    Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET) ||
    Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: gh,
    vk: Boolean(process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET),
    yandex: Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET),
    emailMagic: smtp,
    demo:
      demoEnabled && demoEmail
        ? { email: demoEmail, name: demoName, requiresPassword: demoPasswordSet }
        : undefined
  };
}

export default function LoginPage() {
  return <LoginForm features={readFeatures()} />;
}
