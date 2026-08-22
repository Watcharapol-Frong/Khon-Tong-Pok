import { getSkillIcon } from "@/lib/skillIcons";

/**
 * Renders a brand/tool icon for a hard skill (e.g. React, Docker, Figma)
 * when one exists. Skill names are free text — self-reported, resume-
 * extracted, or O*NET-matched — so most will never have a real logo (not
 * every skill is a brand, and simple-icons itself has dropped several real
 * ones over trademark takedowns). Falls back to a plain initial-letter
 * badge instead of omitting the icon slot or forcing an unrelated icon.
 */
export function SkillIcon({ skill, size = 16 }: { skill: string; size?: number }) {
  const icon = getSkillIcon(skill);

  if (icon) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={`#${icon.hex}`}
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <path d={icon.path} />
      </svg>
    );
  }

  const initial = skill.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#E5E5E5] font-extrabold leading-none text-[#5C5C5C]"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
