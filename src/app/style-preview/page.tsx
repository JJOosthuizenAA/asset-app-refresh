import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StylePreview() {
    return (
        <main className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Tailwind Check</h1>

            {/* This must be a BLUE, rounded, padded box */}
            <div className="bg-blue-500 text-white p-6 rounded-xl shadow">
                If this box is blue with padding & rounded corners, Tailwind works.
            </div>

            {/* This must be a primary-colored button */}
            <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
                Primary Button
            </button>

            {/* This must be a card with rounded corners and shadow */}
            <Card className="transition hover:shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Card Title
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-semibold">42</div>
                </CardContent>
            </Card>
        </main>
    );
}