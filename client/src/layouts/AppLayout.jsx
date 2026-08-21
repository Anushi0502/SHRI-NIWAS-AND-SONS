import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 md:px-6 xl:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
