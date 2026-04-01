// components/ui/Button.tsx
export default function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 ${className}`}
    />
  );
}
