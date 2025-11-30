import { Icons } from "@/components/icons";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <Icons.Logo className="h-6 w-6 text-primary" />
            <span className="inline-block font-headline text-xl font-bold text-foreground">
              Excel View Table
            </span>
          </Link>
        </div>
        <div className="flex items-center justify-end flex-1 space-x-4">
          <nav className="flex items-center space-x-1">
             <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:inline-block">Developed by Jo</span>
          </nav>
        </div>
      </div>
    </header>
  );
}
