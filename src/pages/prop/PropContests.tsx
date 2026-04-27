import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, DollarSign, Target } from "lucide-react";

const PropContests = () => {
  // Contests are not yet implemented – show empty state
  return (
    <PropDashboardLayout title="Contests">
      <div className="space-y-6">
        {/* Stats (zeroed) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Active Contests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Medal className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Best Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">$0</p>
                  <p className="text-sm text-muted-foreground">Total Winnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Contests Joined</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty state */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Contests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-16 text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No contests available</p>
              <p className="text-sm">Contests will be displayed here when available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PropDashboardLayout>
  );
};

export default PropContests;
