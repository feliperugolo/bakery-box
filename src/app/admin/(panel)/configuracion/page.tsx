import SettingsForm from "@/components/admin/settings-form";
import { getSiteSettings } from "@/lib/data";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <h1 className="font-display text-3xl text-brown-900">Configuración</h1>
      <p className="mt-1 text-brown-800/60">
        Estos datos se muestran en el checkout y en el pie de página del
        sitio.
      </p>
      <div className="mt-8">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
