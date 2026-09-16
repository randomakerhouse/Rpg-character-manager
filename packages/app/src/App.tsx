import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "./state/appStore.js";
import { useCloudSyncOrchestrator } from "./hooks/useCloudSyncOrchestrator.js";
import CharacterShell from "./layout/CharacterShell.js";
import HomeScreen from "./screens/HomeScreen.js";
import AccountScreen from "./screens/AccountScreen.js";
import CreateCharacterWizard from "./screens/CreateCharacterWizard/CreateCharacterWizard.js";
import OverviewScreen from "./screens/OverviewScreen.js";
import StatsScreen from "./screens/StatsScreen.js";
import CombatScreen from "./screens/CombatScreen.js";
import AbilitiesScreen from "./screens/AbilitiesScreen.js";
import InventoryScreen from "./screens/InventoryScreen.js";
import EffectsScreen from "./screens/EffectsScreen.js";
import RulesetScreen from "./screens/RulesetScreen.js";
import HistoryScreen from "./screens/HistoryScreen.js";
import SettingsScreen from "./screens/SettingsScreen.js";

export default function App() {
  const init = useAppStore((s) => s.init);
  const loaded = useAppStore((s) => s.loaded);

  useEffect(() => {
    void init();
  }, [init]);

  useCloudSyncOrchestrator();

  if (!loaded) {
    return (
      <div className="empty-state" style={{ paddingTop: "20vh" }}>
        Loading your characters…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/account" element={<AccountScreen />} />
      <Route path="/new" element={<CreateCharacterWizard />} />
      <Route path="/characters/:id" element={<CharacterShell />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewScreen />} />
        <Route path="stats" element={<StatsScreen />} />
        <Route path="combat" element={<CombatScreen />} />
        <Route path="abilities" element={<AbilitiesScreen />} />
        <Route path="inventory" element={<InventoryScreen />} />
        <Route path="effects" element={<EffectsScreen />} />
        <Route path="ruleset" element={<RulesetScreen />} />
        <Route path="history" element={<HistoryScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
