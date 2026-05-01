import { Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="py-12 bg-foreground text-background/80">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Company info */}
          <div>
            <h3 className="text-xl font-bold text-background mb-4">GrowthPro</h3>
            <p className="text-sm leading-relaxed opacity-80">
              Помогаем бизнесу расти с 2014 года. Более 2000 успешных проектов в России и СНГ.
            </p>
          </div>
          
          {/* Contacts */}
          <div>
            <h4 className="font-semibold text-background mb-4">Контакты</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="tel:+78001234567" 
                  className="flex items-center gap-2 text-sm hover:text-background transition-colors"
                >
                  <Phone className="size-4" />
                  8 (800) 123-45-67 (бесплатно)
                </a>
              </li>
              <li>
                <a 
                  href="mailto:info@growthpro.ru" 
                  className="flex items-center gap-2 text-sm hover:text-background transition-colors"
                >
                  <Mail className="size-4" />
                  info@growthpro.ru
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <MapPin className="size-4" />
                Москва, ул. Примерная, 1
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="font-semibold text-background mb-4">Информация</h4>
            <ul className="space-y-2">
              <li>
                <a href="#privacy" className="text-sm hover:text-background transition-colors">
                  Политика конфиденциальности
                </a>
              </li>
              <li>
                <a href="#terms" className="text-sm hover:text-background transition-colors">
                  Пользовательское соглашение
                </a>
              </li>
              <li>
                <a href="#offer" className="text-sm hover:text-background transition-colors">
                  Публичная оферта
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="pt-8 border-t border-background/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm opacity-70">
            © {currentYear} GrowthPro. Все права защищены.
          </p>
          <p className="text-xs opacity-50">
            ИП Иванов И.И. | ИНН: 123456789012 | ОГРНИП: 123456789012345
          </p>
        </div>
      </div>
    </footer>
  )
}
