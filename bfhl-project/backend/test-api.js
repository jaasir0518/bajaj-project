// Quick test script to verify the API logic
const HierarchyService = require('./src/services/hierarchyService');

const userData = {
  user_id: "Mohamed Jaasir",
  email_id: "mj3055@srmist.edu.in",
  college_roll_number: "RA2311026020018"
};

// Test case from the PDF
const testData = [
  "A->B", "A->C", "B->D", "C->E", "E->F",
  "X->Y", "Y->Z", "Z->X",
  "P->Q", "Q->R",
  "G->H", "G->H", "G->I",
  "hello", "1->2", "A->"
];

const service = new HierarchyService(userData);
const result = service.process(testData);
