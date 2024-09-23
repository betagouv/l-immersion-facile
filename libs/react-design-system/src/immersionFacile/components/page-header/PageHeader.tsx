import { fr } from "@codegouvfr/react-dsfr";
import React from "react";
import { useStyles } from "tss-react/dsfr";

export type PageHeaderProps = {
  title: string;
  className?: string;
  children?: React.ReactNode;
  classes?: Partial<Record<"root" | "inner" | "title", string>>;
  centered?: boolean;
};

export const PageHeader = ({
  title,
  className,
  children,
  classes = {},
}: PageHeaderProps) => {
  const { cx } = useStyles();
  return (
    <section
      className={cx(
        fr.cx("fr-pt-2w", "fr-pb-2w"),
        ` ${className ?? ""}`,
        classes.root,
      )}
      role="region"
      aria-label="En-tête de page"
    >
      <div className={cx(fr.cx("fr-container"), classes.inner)}>
        <h1 className={cx(children ? "" : "fr-my-auto", classes.title)}>
          {title}
        </h1>
        {children}
      </div>
    </section>
  );
};
