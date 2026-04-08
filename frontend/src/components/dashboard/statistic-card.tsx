import { Card, CardContent } from "@/components/ui/card";

interface StatisticCardProps {
  title: string;
  value: string | number;
  description?: string;
}

export function StatisticCard({
  title,
  value,
  description,
}: StatisticCardProps) {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardContent className="px-5 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground mb-3">{title}</p>
            <p className="text-4xl font-light mb-2">{value}</p>
            {description && (
              <p className="text-sm font-medium text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
