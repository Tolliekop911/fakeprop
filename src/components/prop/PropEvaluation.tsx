const PropEvaluation = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl lg:text-3xl font-heading font-bold mb-4 text-foreground">
              Complete Your <span className="text-primary">Evaluation</span>
            </h3>
            <p className="text-muted-foreground">
              Demonstrate your trading skill by hitting the profit target without exceeding 
              the static drawdown limit to pass your evaluation
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl lg:text-3xl font-heading font-bold mb-4 text-foreground">
              Trade with <span className="text-primary italic">Simulated</span> Funds
            </h3>
            <p className="text-muted-foreground">
              After successfully passing your evaluation, access your funded trading 
              account. Once you reach your profit target, you receive your payout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropEvaluation;