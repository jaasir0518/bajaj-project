#!/bin/bash

echo "Testing BFHL API..."
echo ""

curl -X POST http://localhost:3000/bfhl \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["A->B", "A->C", "B->D", "C->E", "E->F", "X->Y", "Y->Z", "Z->X", "P->Q", "Q->R", "G->H", "G->H", "G->I", "hello", "1->2", "A->"]
  }' | json_pp

echo ""
echo "Test completed!"
