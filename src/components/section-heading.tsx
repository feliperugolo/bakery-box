export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      {eyebrow && (
        <span className="font-script text-2xl text-gold-500 md:text-3xl">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-1 font-display text-3xl text-brown-900 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 text-brown-800/70 ${
            align === "center" ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
