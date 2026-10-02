import { Card } from "@/components/ui/card";
import {
  Settings,
  Ticket,
  Calendar,
  Mail,
  Database,
  Image,
  Share2,
} from "lucide-react";
import { NotificationSettings } from "@/gbc/components/admin/NotificationSettings";
import { TicketPricingDisplay } from "@/gbc/components/admin/TicketPricingDisplay";
import { EventConfigForm } from "@/gbc/components/admin/EventConfigForm";
import { SystemSettings } from "@/gbc/components/admin/SystemSettings";
import { GallerySettings } from "@/gbc/components/admin/GallerySettings";
import { SocialLinksSettings } from "@/gbc/components/admin/SocialLinksSettings";
import { SettingsEditionPicker } from "@/gbc/components/admin/SettingsEditionPicker";
import { SettingsResetRollback } from "@/gbc/components/admin/SettingsResetRollback";
import {
  getEditionSettings,
  resolveSettingsEdition,
  getPreviousSettings,
} from "@/gbc/services/settingsService";
import { getEditions } from "@/gbc/services/editionService";
import { firstParam } from "@/lib/searchParams";

// Admin page — never safe to statically prerender alongside the other restricted pages.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = firstParam((await searchParams).edition);
  const editions = await getEditions();
  // An unknown/deleted ?edition= falls back to the edition the public site shows rather than erroring.
  const { edition, settings, saved } = await getEditionSettings(
    requested && editions.some((e) => e.key === requested)
      ? requested
      : undefined
  );
  const publicEdition = (await resolveSettingsEdition())?.key ?? null;
  const previousSettings = edition ? await getPreviousSettings(edition) : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-purple-600" />
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure event and application settings
        </p>
      </div>

      <SettingsEditionPicker
        editions={editions}
        edition={edition}
        publicEdition={publicEdition}
        saved={saved}
      />
      <SettingsResetRollback
        edition={edition ?? null}
        saved={saved}
        hasPrevious={!!previousSettings}
      />

      {/* Keyed by edition so switching edition remounts the forms with that edition's values. */}
      <div key={edition ?? "none"} className="grid gap-8">
        {/* Event Configuration */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">Event Configuration</h2>
              <p className="text-sm text-gray-500">
                Manage event details and information
              </p>
            </div>
          </div>

          <EventConfigForm
            settings={settings || null}
            edition={edition ?? undefined}
          />
        </Card>

        {/* Gallery Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Image className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">Gallery Settings</h2>
              <p className="text-sm text-gray-500">
                Configure gallery display and behavior
              </p>
            </div>
          </div>

          <GallerySettings
            settings={settings || null}
            edition={edition ?? undefined}
          />
        </Card>

        {/* Ticket Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Ticket className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">Ticket Settings</h2>
              <p className="text-sm text-gray-500">
                Configure ticket pricing and availability
              </p>
            </div>
          </div>

          <TicketPricingDisplay
            settings={settings || null}
            edition={edition ?? undefined}
          />
        </Card>

        {/* Social Links Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Share2 className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">Social Media Links</h2>
              <p className="text-sm text-gray-500">
                Configure social media platform URLs
              </p>
            </div>
          </div>

          <SocialLinksSettings
            settings={settings || null}
            edition={edition ?? undefined}
          />
        </Card>

        {/* Email Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">Email Notifications</h2>
              <p className="text-sm text-gray-500">
                Configure automated email notifications
              </p>
            </div>
          </div>

          <NotificationSettings
            settings={settings || null}
            edition={edition ?? undefined}
          />
        </Card>

        {/* System Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">System Settings</h2>
              <p className="text-sm text-gray-500">
                Advanced configuration options
              </p>
            </div>
          </div>

          <SystemSettings
            settings={settings || null}
            edition={edition ?? undefined}
          />
        </Card>
      </div>
    </div>
  );
}
