import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { Fragment } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import SetBuilder from "./pages/SetBuilder";
import Warframes from "./pages/Warframes";
import Weapons from "./pages/Weapons";
import Mods from "./pages/Mods";
import Companions from "./pages/Companions";
import Guides from "./pages/Guides";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import Arcanes from "@/pages/Arcanes";
import ArchonShards from "@/pages/ArchonShards";
import Relics from "@/pages/Relics";
import WorldState from "@/pages/WorldState";
import WarframeAssistant from "@/components/WarframeAssistant";

const LOCALIZED_LANGUAGES = ["fr", "en"] as const;

const LOCALIZED_ROUTES = [
  ["/", Home], ["/builder", SetBuilder], ["/warframes", Warframes], ["/weapons", Weapons],
  ["/mods", Mods], ["/companions", Companions], ["/arcanes", Arcanes], ["/archon-shards", ArchonShards],
  ["/relics", Relics], ["/worldstate", WorldState], ["/guides", Guides], ["/resources", Resources], ["/settings", Settings],
] as const;

function Router() {
  return (
    <Switch>
      {LOCALIZED_ROUTES.map(([route, component]) => {
        const Component = component;
        return <Fragment key={route}>
          {LOCALIZED_LANGUAGES.map(lang => <Route key={`${lang}${route}`} path={route === "/" ? `/${lang}` : `/${lang}${route}`} component={Component} />)}
          <Route path={route} component={Component} />
        </Fragment>;
      })}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <WarframeAssistant />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
