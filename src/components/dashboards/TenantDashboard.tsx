import { useState, useEffect } from "react";
import { Bell, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import propertyPayLogo from "@/assets/propertypay-logo.png"; // adjust path if needed

export default function TenantDashboard() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // Example fetch - replace with your Supabase call if needed
    setActivities([]);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 🌐 Global Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo (enlarged) */}
          <div className="flex items-center">
            <img
              src={propertyPayLogo}
              alt="Property Pay"
              className="h-10 w-auto" // logo size increased for visibility
            />
          </div>

          {/* Right side - Notification bell + menu */}
          <div className="flex items-center gap-2">
            {/* 🔔 Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-gray-100"
            >
              <Bell className="h-5 w-5 text-gray-600" />
            </Button>

            {/* ⋮ Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-gray-100"
                >
                  <MoreVertical className="h-5 w-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 📌 Dashboard Content */}
      <main className="p-6 space-y-6">
        {/* Example: Replace with your real content (property search, payments, etc.) */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Find New Properties</h2>
          {/* Insert search bar + results here */}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
          {/* Insert payments component here */}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
          {/* Example usage */}
          {activities.length === 0 ? (
            <p className="text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a, i) => (
                <li key={i} className="p-3 bg-white rounded-xl shadow-sm">
                  {a}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
