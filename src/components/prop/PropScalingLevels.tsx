const scalingLevels = [
  { level: "Apprentice", type: "Evaluation", balance: "$1,000", drawdown: "4%", target: "8%", payout: "" },
  { level: "Trainee", type: "Evaluation", balance: "$1,000", drawdown: "4%", target: "8%", payout: "" },
  { level: "Intern", type: "Funded", balance: "$1,000", drawdown: "4%", target: "8%", payout: "50%" },
  { level: "Jr. Associate", type: "Funded", balance: "$1,750", drawdown: "4%", target: "8%", payout: "50%" },
  { level: "Associate", type: "Funded", balance: "$3,063", drawdown: "4%", target: "8%", payout: "50%" },
  { level: "Sr. Associate", type: "Funded", balance: "$5,359", drawdown: "4%", target: "8%", payout: "50%" },
];

const PropScalingLevels = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl lg:text-5xl font-heading font-bold text-center mb-12 text-primary">
          Scaling Levels
        </h2>
        
        <div className="max-w-6xl mx-auto overflow-x-auto">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-4 text-left text-primary font-heading font-semibold">Level</th>
                  <th className="px-6 py-4 text-left text-primary font-heading font-semibold">Account Type</th>
                  <th className="px-6 py-4 text-left text-primary font-heading font-semibold">Starting Balance</th>
                  <th className="px-6 py-4 text-left text-primary font-heading font-semibold">Static Drawdown</th>
                  <th className="px-6 py-4 text-left text-primary font-heading font-semibold">Profit Target</th>
                  <th className="px-6 py-4 text-left text-primary font-heading font-semibold">Payout Percent</th>
                </tr>
              </thead>
              <tbody>
                {scalingLevels.map((level, index) => (
                  <tr 
                    key={index} 
                    className={index % 2 === 0 ? "bg-muted/20" : "bg-muted/10"}
                  >
                    <td className="px-6 py-4 text-foreground">{level.level}</td>
                    <td className="px-6 py-4 text-foreground">{level.type}</td>
                    <td className="px-6 py-4 text-foreground">{level.balance}</td>
                    <td className="px-6 py-4 text-foreground">{level.drawdown}</td>
                    <td className="px-6 py-4 text-foreground">{level.target}</td>
                    <td className="px-6 py-4 text-primary font-semibold">{level.payout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropScalingLevels;
