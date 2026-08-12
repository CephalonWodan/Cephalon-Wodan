import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SetBuilder from "./pages/SetBuilder";
import Warframes from "./pages/Warframes";
import Weapons from "./pages/Weapons";
import Mods from "./pages/Mods";
import Companions from "./pages/Companions";
import Guides from "./pages/Guides";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import Arcanes from "./pages/Arcanes";
import ArchonShards from "./pages/ArchonShards";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/builder"} component={SetBuilder} />
      <Route path={"/warframes"} component={Warframes} />
      <Route path={"/weapons"} component={Weapons} />
      <Route path={"/mods"} component={Mods} />
      <Route path={"/companions"} component={Companions} />
      <Route path={"/arcanes"} component={Arcanes} />
      <Route path={"/archon-shards"} component={ArchonShards} />
      <Route path={"/guides"} component={Guides} />
      <Route path={"/resources"} component={Resources} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
