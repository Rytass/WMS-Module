# Transfer Services Implementation - Quick Reference

## Overview

Completed implementation of `TransferCustomerOrderService` and `TransferVendorOrderService` based on the `AllocateInventoryOrderService` pattern.

## Usage Pattern Diagram

```
CreateTransfer (customer/vendor)
    ↓
1. Save order record
2. For each item:
   - Call splitBatch(id, {customerId/vendorId}) → new batch
   - Deduct -quantity from original batch (stock)
   - Add +quantity to splitted batch (stock)
   - Create change record
    ↓
Order created with items

ReturnTransfer
    ↓
1. For each item:
   - Call splitBatch(id, {customerId/vendorId: null}) → new batch
   - Add +quantity to original batch (stock)
   - Deduct -quantity from splitted batch (stock)
   - Create change record (negative quantity)
    ↓
Stock returned to available inventory
```

## Key Files Location Map

```
libs/core/src/lib/
├── services/
│   ├── transfer-customer-order.service.ts         (Main service)
│   └── transfer-vendor-order.service.ts           (Main service)
├── typings/
│   ├── create-transfer-customer-order.input.ts    (Input types)
│   ├── create-transfer-vendor-order.input.ts      (Input types)
│   └── index.ts                                   (Exports)

libs/graphql/src/lib/
├── inputs/
│   ├── create-transfer-customer-order.args.ts     (GraphQL args)
│   ├── create-transfer-customer-order-item.args.ts
│   ├── return-transfer-customer-order.args.ts
│   └── [vendor variants...]
├── dto/
│   ├── transfer-customer-order.dto.ts              (GraphQL DTOs)
│   ├── transfer-customer-order-item.dto.ts
│   └── [vendor variants...]
├── mutations/
│   ├── transfer-customer-order.mutation.ts        (GraphQL mutations)
│   └── transfer-vendor-order.mutation.ts
└── resolvers/
    ├── transfer-customer-order.resolver.ts        (DataLoader)
    └── transfer-vendor-order.resolver.ts
```

## Service Methods Signature

```typescript
// Create a new transfer order
createTransferCustomerOrder(
  options: CreateTransferCustomerOrderInput,
  manager?: EntityManager
): Promise<TransferCustomerOrderDto>

// Update an existing order (add/remove items)
updateTransferCustomerOrder(
  options: UpdateTransferCustomerOrderInput & { manager?: EntityManager }
): Promise<TransferCustomerOrderDto>

// Return items to inventory (deallocate)
returnTransferCustomerOrder(
  options: TransferCustomerOrderItemInput | TransferCustomerOrderItemInput[]
): Promise<boolean>
```

## GraphQL API

### Create Transfer

```graphql
mutation {
  createTransferCustomerOrder(
    customerId: "CUST-001"
    description: "Transfer to customer"
    items: [
      {
        aggregatedKey: "batch_material_location_loader"
        targetTransferredQuantity: 100
      }
    ]
  ) {
    id
    key
    createdAt
    items {
      id
      batchId
      materialId
      targetTransferredQuantity
    }
  }
}
```

### Return Transfer

```graphql
mutation {
  returnTransferCustomerOrder(items: [{ itemId: "item-uuid", quantity: 50 }])
}
```

## Stock Movement Logic

### Transfer Creation

```
Original Batch: quantity -100  (deduct from available)
Split Batch (customerId=X): quantity +100  (track customer allocation)
```

### Transfer Return

```
Original Batch: quantity +50  (restore to available)
Split Batch (customerId=null): quantity -50  (remove allocation)
```

## DataLoader Pattern

Both resolvers use `loaders.batchMany.load()` to batch-load order items, preventing N+1 queries when querying multiple orders.

## Error Handling

- Order not found: Throws error when updating non-existent order
- Invalid quantities: Throws error if return quantity exceeds transferred quantity
- Missing required fields: GraphQL validation on inputs

## Integration Points

- ✅ Already registered in WmsModuleCoreModule
- ✅ Already registered in WmsModuleGraphqlModule
- ✅ Entities already exist in models
- ✅ All exports configured in index files
