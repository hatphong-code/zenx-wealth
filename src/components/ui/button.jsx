export function Button({ children, onClick, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020] disabled:pointer-events-none disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
