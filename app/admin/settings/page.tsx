import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Server, Key, Mail, Info } from 'lucide-react';
import { getAuthorizedAdminNumbers } from '@/lib/admin/authorized-admins';

const authorizedAdmins = getAuthorizedAdminNumbers();
const authorizedAdminDisplay =
  authorizedAdmins.length > 0
    ? authorizedAdmins
      .map(admin => `${admin.countryCode} ${admin.mobile}`)
      .join(', ')
    : 'Not configured (set AUTHORIZED_ADMIN_NUMBERS in .env)';

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration and admin account information.
        </p>
      </div>

      {/* Admin account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Admin Account
          </CardTitle>
          <CardDescription>
            Your authorized admin account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingsRow
            label="Authorized admin mobiles"
            value={authorizedAdminDisplay}
          />
          <SettingsRow label="Role" value="Super Admin" />
          <SettingsRow label="Auth Method" value="iVALT Biometric" />
          <SettingsRow label="Session Duration" value="24 hours" />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Security
          </CardTitle>
          <CardDescription>
            Authentication and session configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingsRow label="Session Storage" value="HTTP-only Cookie" />
          <SettingsRow label="Token Signing" value="HMAC-SHA256" />
          <SettingsRow label="Cookie SameSite" value="Strict" />
          <SettingsRow label="Cookie Secure" value="Production only" />
          <Separator className="my-3" />
          <SettingsRow label="Rate Limiting" value="5 attempts / minute" />
          <SettingsRow label="Login Attempts" value="Logged & monitored" />
        </CardContent>
      </Card>

      {/* System info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-5" />
            System Information
          </CardTitle>
          <CardDescription>
            Application and infrastructure details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingsRow label="Application" value="iVALT OnDemand ID" />
          <SettingsRow label="Framework" value="Next.js 16 (App Router)" />
          <SettingsRow label="Database ORM" value="Drizzle ORM" />
          <SettingsRow label="Auth Provider" value="iVALT Biometric API" />
          <SettingsRow label="Admin Panel" value="v1.0.0" />
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5" />
            Admin Capabilities
          </CardTitle>
          <CardDescription>What you can manage from this panel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">Customers</Badge>
              <span className="text-xs text-muted-foreground">
                View, search, provision
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Requests</Badge>
              <span className="text-xs text-muted-foreground">
                Monitor verifications
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Dashboard</Badge>
              <span className="text-xs text-muted-foreground">
                Stats and analytics
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Settings</Badge>
              <span className="text-xs text-muted-foreground">
                System configuration
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            For environment variable changes or system configuration updates,
            contact your iVALT account manager.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
