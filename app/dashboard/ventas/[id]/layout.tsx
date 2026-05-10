export default function SaleDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#101010] overflow-y-auto">
      {children}
    </div>
  );
}
