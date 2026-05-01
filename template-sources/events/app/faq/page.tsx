import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const metadata = {
  title: "FAQ — EventHub",
  description: "Часто задаваемые вопросы о регистрации на мероприятия и работе платформы EventHub.",
}

const faqCategories = [
  {
    title: "Регистрация и участие",
    items: [
      {
        question: "Как зарегистрироваться на мероприятие?",
        answer:
          "Выберите интересующее мероприятие в каталоге или календаре, перейдите на страницу события и заполните форму регистрации. После отправки формы вы получите подтверждение на указанный email.",
      },
      {
        question: "Как отменить регистрацию?",
        answer:
          "Для отмены регистрации перейдите по ссылке в письме-подтверждении или свяжитесь с организатором мероприятия напрямую. Обратите внимание, что политика возврата может отличаться для разных событий.",
      },
      {
        question: "Могу ли я изменить данные регистрации?",
        answer:
          "Да, вы можете изменить данные регистрации, связавшись с организатором мероприятия. Контактная информация организатора указана на странице события.",
      },
      {
        question: "Можно ли зарегистрировать несколько участников?",
        answer:
          "Да, при регистрации вы можете указать количество участников. Стоимость будет рассчитана автоматически в зависимости от количества мест.",
      },
    ],
  },
  {
    title: "Оплата",
    items: [
      {
        question: "Какие способы оплаты доступны?",
        answer:
          "Мы принимаем оплату банковскими картами Visa, MasterCard, МИР. Для некоторых мероприятий доступна оплата через SberPay и YooMoney.",
      },
      {
        question: "Как получить чек об оплате?",
        answer:
          "Чек об оплате автоматически отправляется на указанный при регистрации email после успешной оплаты.",
      },
      {
        question: "Возможен ли возврат средств?",
        answer:
          "Политика возврата определяется организатором каждого мероприятия. Обычно возврат возможен не позднее чем за 7 дней до начала события. Подробности уточняйте у организатора.",
      },
    ],
  },
  {
    title: "Мероприятия",
    items: [
      {
        question: "Будет ли запись мероприятия?",
        answer:
          "Наличие записи зависит от конкретного мероприятия и решения организатора. Информация о записи обычно указана на странице события. Если запись не упомянута, рекомендуем уточнить у организатора.",
      },
      {
        question: "Как узнать о новых событиях?",
        answer:
          "Вы можете регулярно проверять наш каталог и календарь событий. Также мы рекомендуем подписаться на рассылку — так вы будете получать уведомления о новых мероприятиях в интересующих вас категориях.",
      },
      {
        question: "Как добраться до места проведения?",
        answer:
          "На странице каждого офлайн-мероприятия указан точный адрес и карта. Организаторы часто добавляют рекомендации по транспорту и парковке.",
      },
      {
        question: "Что делать, если мероприятие отменено?",
        answer:
          "В случае отмены мероприятия организатор свяжется с вами по email. Возврат средств производится в соответствии с политикой возврата организатора.",
      },
    ],
  },
  {
    title: "Техническая поддержка",
    items: [
      {
        question: "Не приходит письмо с подтверждением",
        answer:
          "Проверьте папку «Спам» в вашей почте. Если письма нет, убедитесь, что вы правильно указали email при регистрации. При необходимости свяжитесь с нашей службой поддержки.",
      },
      {
        question: "Как связаться со службой поддержки?",
        answer:
          "Вы можете написать нам на support@eventhub.ru или воспользоваться формой обратной связи внизу страницы. Мы отвечаем в течение 24 часов в рабочие дни.",
      },
      {
        question: "Не работает онлайн-трансляция",
        answer:
          "Убедитесь, что у вас стабильное интернет-соединение. Попробуйте обновить страницу или использовать другой браузер. Если проблема сохраняется, свяжитесь с организатором мероприятия.",
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Часто задаваемые вопросы
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Ответы на популярные вопросы о работе платформы
          </p>
        </div>

        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h2 className="mb-4 text-xl font-semibold">{category.title}</h2>
              <Accordion type="single" collapsible className="rounded-xl border border-border">
                {category.items.map((item, itemIndex) => (
                  <AccordionItem
                    key={itemIndex}
                    value={`${categoryIndex}-${itemIndex}`}
                    className="border-b border-border last:border-0"
                  >
                    <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Contact section */}
        <div className="mt-12 rounded-xl border border-border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold">Не нашли ответ?</h2>
          <p className="mt-2 text-muted-foreground">
            Свяжитесь с нашей службой поддержки, и мы поможем решить ваш вопрос
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button>
              <Mail className="mr-2 h-4 w-4" />
              Написать в поддержку
            </Button>
            <Link href="/events">
              <Button variant="outline">Перейти к событиям</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
