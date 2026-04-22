import { FolderKanban, Rocket } from "lucide-react";

import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const mockProjects = [
  { name: "Лендинг фитнес-клуба", status: "Черновик", updated: "2 часа назад" },
  { name: "Корпоративный сайт IT-компании", status: "Готов", updated: "Вчера" },
  { name: "Портфолио фотографа", status: "В работе", updated: "3 дня назад" }
];

export default function ProjectsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Мои проекты</h1>
            <p className="text-sm text-zinc-400">Управляйте созданными сайтами и запускайте новые генерации.</p>
          </div>
          <Button>
            <Rocket className="h-4 w-4" />
            Новый проект
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockProjects.map((project) => (
            <Card key={project.name} className="transition-all hover:-translate-y-1 hover:border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderKanban className="h-4 w-4 text-fuchsia-300" />
                  {project.name}
                </CardTitle>
                <CardDescription>Обновлено: {project.updated}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {project.status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
