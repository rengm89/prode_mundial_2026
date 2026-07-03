import styles from "./Skeleton.module.css";

export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonDot} />
        <div className={styles.skeletonText} style={{ width: "40%", marginRight: "auto" }} />
        <div className={styles.skeletonText} style={{ width: "80px" }} />
      </div>
    </div>
  );
}

export function SkeletonPartido() {
  return (
    <div className={styles.skeletonPartido}>
      <div className={styles.skeletonLine} style={{ width: "60px", marginBottom: "8px" }} />
      <div className={styles.skeletonFila}>
        <div className={styles.skeletonBandera} />
        <div className={styles.skeletonLine} style={{ flex: 1, marginRight: "8px" }} />
        <div className={styles.skeletonScore} />
        <div className={styles.skeletonLine} style={{ flex: 1, marginLeft: "8px" }} />
        <div className={styles.skeletonBandera} />
      </div>
    </div>
  );
}

export function SkeletonPronosticos() {
  return (
    <div className={styles.skeletonContainer}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div className={styles.skeletonLine} style={{ width: "30%", height: "24px", marginBottom: "8px" }} />
        <div className={styles.skeletonLine} style={{ width: "50%", height: "14px" }} />
      </div>

      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ marginBottom: "8px" }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTabla() {
  return (
    <div className={styles.skeletonContainer}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div className={styles.skeletonLine} style={{ width: "30%", height: "24px" }} />
      </div>

      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ marginBottom: "8px" }}>
          <div className={styles.skeletonFila}>
            <div className={styles.skeletonLine} style={{ width: "40px" }} />
            <div className={styles.skeletonBandera} />
            <div className={styles.skeletonLine} style={{ flex: 1, marginLeft: "8px" }} />
            <div className={styles.skeletonLine} style={{ width: "50px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
