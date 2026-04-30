import { TemplateLayerEditorApp } from "@/components/template-layer-editor/template-layer-editor-app";

export default function GridEditorPlaygroundPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <h1 className="mb-4 shrink-0 text-lg font-semibold tracking-tight">Редактор шаблонов: слои и сетка</h1>
      <TemplateLayerEditorApp />
    </div>
  );
}
