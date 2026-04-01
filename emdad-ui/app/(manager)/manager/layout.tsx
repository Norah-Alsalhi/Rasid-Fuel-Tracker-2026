import ManagerShell from "@/components/manager/ManagerShell";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerShell>{children}</ManagerShell>;
}
