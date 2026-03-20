# Transfer Customer & Vendor Order Services - Usage Guide

## Overview

The transfer-customer and transfer-vendor services follow the same pattern as allocate-inventory-order, using batch splitting to track state with customer/vendor identifiers.

## Key Concepts

### State Tracking via Batch Splitting

- **Transfer-Customer**: When transferring to a customer, `splitBatch()` is called with `customerId`
  - Creates a new batch with the same batchGroup that tracks which customer it's allocated to
  - Original batch remains unchanged for stock tracking
- **Transfer-Vendor**: When transferring to a vendor, `splitBatch()` is called with `vendorId`
  - Creates a new batch with the same batchGroup that tracks which vendor it's allocated to
  - Original batch remains unchanged for stock tracking

### Return/Deallocate Pattern

To return stock from a customer/vendor back to available inventory:

- Call `returnTransferCustomerOrder()` or `returnTransferVendorOrder()`
- This splits the batch with `customerId: null` or `vendorId: null`
- This marks the stock as "unallocated" and available for new transfers

## GraphQL Mutations

### Create Transfer Customer Order

```graphql
mutation CreateTransferCustomer(
  $items: [CreateTransferCustomerOrderItemArgs!]!
) {
  createTransferCustomerOrder(
    customerId: "CUST-001"
    description: "Transfer to customer"
    items: $items
  ) {
    id
    key
    customerId
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

### Return Transfer Customer Order

```graphql
mutation ReturnTransfer($items: [ReturnTransferCustomerOrderArgs!]!) {
  returnTransferCustomerOrder(items: $items)
}
```

### Update Transfer Customer Order

```graphql
mutation UpdateTransferCustomer(
  $id: ID!
  $items: [UpdateTransferCustomerOrderItemArgs!]
) {
  updateTransferCustomerOrder(id: $id, customerId: "CUST-001", items: $items) {
    id
    key
    items {
      id
      targetTransferredQuantity
    }
  }
}
```

## Service Methods

### TransferCustomerOrderService

```typescript
// Create transfer order with items
async createTransferCustomerOrder(
  options: CreateTransferCustomerOrderInput
): Promise<TransferCustomerOrderDto>

// Update existing order
async updateTransferCustomerOrder(
  options: UpdateTransferCustomerOrderInput
): Promise<TransferCustomerOrderDto>

// Return items to inventory (deallocate)
async returnTransferCustomerOrder(
  options: TransferCustomerOrderItemInput | TransferCustomerOrderItemInput[]
): Promise<boolean>
```

### TransferVendorOrderService

Same structure as TransferCustomerOrderService but uses `vendorId` instead of `customerId`.

## Stock Movement Tracking

When creating a transfer:

1. Original batch: `-quantity` (deducted from available)
2. Splitted batch (with customerId/vendorId): `+quantity` (tracks allocated to customer/vendor)

When returning:

1. Original batch: `+quantity` (restored to available)
2. Splitted batch (with customerId/vendorId set to null): `-quantity` (removed from allocation)

## Input Item Structure

```typescript
{
  aggregatedKey: string  // From stock aggregation (contains batchId, materialId, locationId, loaderId)
  unitId?: string        // Optional unit conversion
  targetTransferredQuantity: number  // Quantity to transfer
}
```

The `aggregatedKey` is destructured into `batchId`, `materialId`, `locationId`, and `loaderId` by the mutation.

## Change Tracking

Both services create `TransferCustomerOrderChange` / `TransferVendorOrderChange` records for:

- Quantity changes (positive for transfers, negative for returns)
- Links to items and orders for audit trail
