import { LoginForm, type LoginFeatures } from "@/components/login-form";

function readFeatures(): LoginFeatures {
  const smtp =
    Boolean(process.env.EMAIL_SERVER_HOST) &&
    Boolean(process.env.EMAIL_SERVER_USER) &&
    Boolean(process.env.EMAIL_SERVER_PASSWORD) &&
    Boolean(process.env.EMAIL_FROM);

  return {
    vk: Boolean(process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET),
    yandex: Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET),
    emailMagic: smtp
  };
}

export default function LoginPage() {
  return <LoginForm features={readFeatures()} />;
}
