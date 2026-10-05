import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./DecoratedTitle.module.css";

const DecoratedTitle = ({ children, className, id }: { children: ReactNode; className?: string; id?: string }) => (
  <div className={clsx(styles.title, className)} id={id}>
    {children}
  </div>
);

export default DecoratedTitle;
