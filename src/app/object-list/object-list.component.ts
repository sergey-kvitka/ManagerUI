import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {ModalDismissReasons, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {FormBuilder, FormGroup} from "@angular/forms";

export class Object {
    constructor(
        public id: number,
        public name: string,
        public objectTypeId: number,
        public parentObjectId: number
    ) {
    }
}

@Component({
    selector: 'app-object-list',
    templateUrl: './object-list.component.html',
    styleUrls: ['./object-list.component.css']
})
export class ObjectListComponent implements OnInit, OnChanges {

    @Input() objectTypeId?: string = undefined;

    objects?: Object[] = [];
    parentObjects: Map<number, string> = new Map<number, string>();
    objectTypeNames: Map<number, string> = new Map<number, string>();

    editForm!: FormGroup;
    closeResult: string | undefined;

    constructor(
        private httpClient: HttpClient,
        private modalService: NgbModal,
        private fb: FormBuilder
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.ngOnInit();
    }

    ngOnInit(): void {
        if (this.objectTypeId != undefined && +this.objectTypeId != 0) {
            this.parentObjects = new Map<number, string>();
            this.objectTypeNames = new Map<number, string>();
            this.getObjectsByTypeId(+this.objectTypeId).subscribe(objects => {
                this.objects = objects;
                objects.forEach(obj => {
                    this.getObject(obj.parentObjectId).subscribe(parentObject => {
                        if (parentObject == null) {
                            this.parentObjects.set(obj.id, '—');
                        } else {
                            this.parentObjects.set(obj.id, parentObject.name);
                        }
                    });

                    this.getObjectType(obj.objectTypeId).subscribe(objType => {
                        this.objectTypeNames.set(obj.id, objType.name);
                    });
                });
            });
        }

        this.editForm = this.fb.group({
            id: [''],
            name: [''],
            objectTypeId: [''],
            parentObjectId: ['']
        });
    }

    getObjectsByTypeId(id: number) {
        return this.httpClient.get<Object[]>(
            `http://localhost:8080/objects/get_objects_by_object_type_id_with_children/${id}`
        );
    }

    getObject(id: number) {
        return this.httpClient.get<Object>(
            `http://localhost:8080/objects/${id == 0 ? 'null' : id}`
        );
    }

    getObjectType(id: number) {
        return this.httpClient.get<Object>(
            `http://localhost:8080/object_types/${id == 0 ? 'null' : id}`
        );
    }

    toggleValueDiv(id: number) {
        let values = document.getElementById(`values_${id}`); //@ts-ignore
        values.classList.toggle('display-flex'); //@ts-ignore
        values.classList.toggle('display-none');
        let arrow = document.getElementById(`arrow_${id}`); //@ts-ignore
        arrow.classList.toggle('fa-arrow-down'); //@ts-ignore
        arrow.classList.toggle('fa-arrow-up');
    }

    openEdit(targetModal: any, object: Object) {
        this.modalService.open(targetModal, {centered: true, backdrop: true, size: "lg"});

        this.editForm.patchValue({
            id: object.id,
            name: object.name,
            objectTypeId: object.objectTypeId,
            parentObjectId: object.parentObjectId
        });
    }

    onSave() {
        let object: Object = this.editForm.value;
        if (object.name.trim() == '') {
            alert('Object\'s name can\'t be empty');
            return;
        }
        this.httpClient.get<string[]>(`http://localhost:8080/objects/isAvailableObject/${
            object.name}/${object.objectTypeId}/${object.parentObjectId}`).subscribe(result => {
                if (result[0] != 'true') {
                    alert(result[0]);
                }
                else {
                    this.httpClient.put(`http://localhost:8080/objects/${object.id}/edit`, object)
                        .subscribe(() => {
                            this.ngOnInit();
                            this.modalService.dismissAll();
                        })
                }
        })
    }

    onSubmit(f: any) {
        // @ts-ignore
        let object: Object = new Object(0, f.value.name, +this.objectTypeId, '');
        let empty: string = '';

        if (object.name.trim() == empty) {
            alert('Name can\'t be empty string.');
            return;
        }
        if (object.objectTypeId.toString().trim() == empty) {
            alert('Object must has object type ID.');
            return;
        }

        const url = 'http://localhost:8080/objects/isAvailableObject/' +
            object.name.trim() + '/' +
            object.objectTypeId.toString().trim() + '/' +
            (object.parentObjectId.toString().trim() == empty
                ? "null"
                : object.parentObjectId.toString().trim());

        this.httpClient.get<string>(url).subscribe(result => {
            if (result[0] != 'true') {
                alert(result[0]);
            } else {
                this.httpClient.post('http://localhost:8080/objects/add_new', object)
                    .subscribe(() => {
                        this.ngOnInit();
                    });
                this.modalService.dismissAll(); //dismiss the modal
            }
        });
    }

    open(content: any) {
        this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
            this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
            this.closeResult = `Dismissed ${ObjectListComponent.getDismissReason(reason)}`;
        });
    }

    private static getDismissReason(reason: any): string {
        if (reason === ModalDismissReasons.ESC) {
            return 'by pressing ESC';
        } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
            return 'by clicking on a backdrop';
        } else {
            return `with: ${reason}`;
        }
    }

    delete(object: Object) {
        this.httpClient.delete(`http://localhost:8080/objects/${object.id}/delete`).subscribe(_ => {
            this.ngOnInit();
        })
    }
}
