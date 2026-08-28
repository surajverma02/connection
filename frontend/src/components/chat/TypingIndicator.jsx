const TypingIndicator = () => (
  <div className="mb-2 flex items-center gap-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700" />
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  </div>
);

export default TypingIndicator;
