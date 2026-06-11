import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import proxmoxApi from "../api/proxmoxapi";

const Visualization = () => {
    const location = useLocation();
    const [vms, setVms] = useState(location.state?.vms || []);
    const [loading, setLoading] = useState(!location.state?.vms);

    // Only fetch if data wasn't passed via navigation state
    useEffect(() => {
        if (location.state?.vms) return; // Data already available
        
        const fetchData = async () => {
            try {
                const response = await proxmoxApi.get("/proxmox/vms/vmData");
                setVms(response.data);
            } catch (err) {
                console.error("Failed to fetch VM data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.state]);

    // OS Distribution Calculation
    const osDistribution = useMemo(() => {
        let linux = 0;
        let windows = 0;
        let other = 0;

        vms.forEach((vm) => {
            const os = (vm.vm_os || vm.os || "").toLowerCase();
            if (os.includes("linux") || os.includes("ubuntu") || os.includes("debian") || os.includes("centos") || os.includes("redhat") || os.includes("fedora") || os.includes("rhel") || os.includes("rocky") || os.includes("alma")) {
                linux++;
            } else if (os.includes("windows") || os.includes("win")) {
                windows++;
            } else {
                other++;
            }
        });

        const total = linux + windows + other;
        return { linux, windows, other, total };
    }, [vms]);

    // Calculate pie chart gradient
    const getPieGradient = () => {
        const { linux, windows, other, total } = osDistribution;
        if (total === 0) return "conic-gradient(#e2e8f0 0deg 360deg)";

        const linuxPercent = (linux / total) * 100;
        const windowsPercent = (windows / total) * 100;

        const linuxEnd = linuxPercent * 3.6;
        const windowsEnd = linuxEnd + windowsPercent * 3.6;

        return `conic-gradient(
            #f97316 0deg ${linuxEnd}deg,
            #d02da2ff ${linuxEnd}deg ${windowsEnd}deg,
            #8b5cf6 ${windowsEnd}deg 360deg
        )`;
    };

    // Inline Styles
    const styles = {
        container: {
            minHeight: "100vh",
            padding: "40px",
        },
        title: {
            textAlign: "center",
            color: "#4413a6ff",
            fontSize: "32px",
            fontWeight: "700",
            marginBottom: "40px",
        },
        chartCard: {
            maxWidth: "600px",
            margin: "0 auto",
            background: "#f7f1ffff",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 10px 40px rgba(30, 12, 59, 0.2)",
        },
        chartSection: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "50px",
            flexWrap: "wrap",
        },
        pieContainer: {
            position: "relative",
            width: "200px",
            height: "200px",
        },
        pie: {
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: getPieGradient(),
        },
        pieCenter: {
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100px",
            height: "100px",
            background: "#ffffff",
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        },
        totalCount: {
            fontSize: "28px",
            fontWeight: "700",
            color: "#1e293b",
        },
        totalLabel: {
            fontSize: "12px",
            color: "#64748b",
        },
        legend: {
            display: "flex",
            flexDirection: "column",
            gap: "16px",
        },
        legendItem: {
            display: "flex",
            alignItems: "center",
            gap: "12px",
        },
        legendColorLinux: {
            width: "20px",
            height: "20px",
            borderRadius: "4px",
            background: "#f97316",
        },
        legendColorWindows: {
            width: "20px",
            height: "20px",
            borderRadius: "4px",
            background: "#d02da2ff",
        },
        legendColorOther: {
            width: "20px",
            height: "20px",
            borderRadius: "4px",
            background: "#8b5cf6",
        },
        legendInfo: {
            display: "flex",
            flexDirection: "column",
        },
        legendLabel: {
            fontSize: "16px",
            fontWeight: "600",
            color: "#1e293b",
        },
        legendValue: {
            fontSize: "13px",
            color: "#64748b",
        },
        loading: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "18px",
            color: "#ffffff",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        },
    };

    if (loading) {
        return <div style={styles.loading}>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>OS Distribution Visualization</h1>
            
            <div style={styles.chartCard}>
                <div style={styles.chartSection}>
                    <div style={styles.pieContainer}>
                        <div style={styles.pie}></div>
                        <div style={styles.pieCenter}>
                            <span style={styles.totalCount}>{osDistribution.total}</span>
                            <span style={styles.totalLabel}>Total VMs</span>
                        </div>
                    </div>

                    <div style={styles.legend}>
                        <div style={styles.legendItem}>
                            <div style={styles.legendColorLinux}></div>
                            <div style={styles.legendInfo}>
                                <span style={styles.legendLabel}>Linux</span>
                                <span style={styles.legendValue}>
                                    {osDistribution.linux} VMs ({osDistribution.total > 0 ? ((osDistribution.linux / osDistribution.total) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                        </div>

                        <div style={styles.legendItem}>
                            <div style={styles.legendColorWindows}></div>
                            <div style={styles.legendInfo}>
                                <span style={styles.legendLabel}>Windows</span>
                                <span style={styles.legendValue}>
                                    {osDistribution.windows} VMs ({osDistribution.total > 0 ? ((osDistribution.windows / osDistribution.total) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                        </div>

                        <div style={styles.legendItem}>
                            <div style={styles.legendColorOther}></div>
                            <div style={styles.legendInfo}>
                                <span style={styles.legendLabel}>Other</span>
                                <span style={styles.legendValue}>
                                    {osDistribution.other} VMs ({osDistribution.total > 0 ? ((osDistribution.other / osDistribution.total) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Visualization;
