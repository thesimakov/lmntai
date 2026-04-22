import { Coins } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TokenBalanceProps = {
  title: string;
  value: number | string;
  description: string;
};

export function TokenBalance({ title, value, description }: TokenBalanceProps) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium text-zinc-300">{title}</CardTitle>
        <Coins className="h-5 w-5 text-fuchsia-300" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
      </CardContent>
    </Card>
  );
}
