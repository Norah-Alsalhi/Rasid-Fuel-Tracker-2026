//components/ui/Input.tsx
export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-200 ${className}`} />;
}
