const HierarchyService = require('../services/hierarchyService');

const processBfhl = (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid input: data must be an array'
      });
    }

    // User data - REPLACE WITH YOUR ACTUAL DETAILS
    const userData = {
      user_id: "Mohamed Jaasir",
      email_id: "mj3055@srmist.edu.in",
      college_roll_number: "RA2311026020018"
    };

    const service = new HierarchyService(userData);
    const result = service.process(data);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = { processBfhl };
